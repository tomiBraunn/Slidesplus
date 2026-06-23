import jwt from "jsonwebtoken"
import { pool } from "../config/database.js"
import { supabase } from "../services/supabaseService.js"

export async function auth(req, res, next) {
	const h = req.headers.authorization || ""
	const token = h.startsWith("Bearer ") ? h.slice(7) : null
	if (!token) return res.status(401).json({ message: "Missing token" })

	// Try backend JWT first
	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET)
		if (!pool) return res.status(500).json({ message: "Database not configured" })
		const r = await pool.query("SELECT id FROM users WHERE id=$1", [payload.sub])
		if (r.rowCount === 0) return res.status(401).json({ message: "User deleted" })
		req.user = payload
		return next()
	} catch (jwtErr) {
		// Not a backend JWT or verification failed; fall through to Supabase check
	}

	// Try Supabase token
	try {
		const { data, error } = await supabase.auth.getUser(token)
		if (error || !data?.user) {
			console.error("[Auth] Invalid Supabase token:", error && error.message)
			return res.status(401).json({ message: "Invalid token" })
		}

		const user = data.user
		if (!pool) return res.status(500).json({ message: "Database not configured" })

		// Ensure user exists in public.users; create if missing
		const userRes = await pool.query("SELECT id FROM users WHERE id=$1", [user.id])
		if (userRes.rowCount === 0) {
			const metadata = user.user_metadata || {}
			const username = metadata.preferred_username || metadata.user_name || metadata.full_name?.replace(/\s+/g, "").toLowerCase() || user.email?.split("@")[0] || user.id
			try {
				await pool.query(
					`INSERT INTO users (id, username, email, password, first_name, last_name, avatar)
					VALUES ($1, $2, $3, $4, $5, $6, $7)
					ON CONFLICT (id) DO NOTHING`,
					[
						user.id,
						username,
						user.email || "",
						"oauth_no_password",
						metadata.full_name?.split(" ")[0] || metadata.first_name || "",
						metadata.full_name?.split(" ").slice(1).join(" ") || metadata.last_name || "",
						metadata.avatar_url || metadata.picture || null
					]
				)
			} catch (insertErr) {
				console.error("[Auth] Error inserting user from Supabase:", insertErr)
			}
		}

		req.user = { sub: user.id, email: user.email }
		return next()
	} catch (err) {
		console.error("[Auth] Error validating Supabase token:", err)
		return res.status(401).json({ message: "Invalid token" })
	}
}

export async function optionalAuth(req, res, next) {
	const h = req.headers.authorization || ""
	const token = h.startsWith("Bearer ") ? h.slice(7) : null

	if (!token) {
		req.user = null
		return next()
	}

	// Try backend JWT first
	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET)
		if (!pool) {
			req.user = null
			return next()
		}
		const r = await pool.query("SELECT id FROM users WHERE id=$1", [payload.sub])
		req.user = r.rowCount > 0 ? payload : null
		return next()
	} catch (jwtErr) {
		// Fall back to Supabase
	}

	try {
		const { data, error } = await supabase.auth.getUser(token)
		if (error || !data?.user) {
			req.user = null
			return next()
		}
		req.user = { sub: data.user.id, email: data.user.email }
		return next()
	} catch (err) {
		console.error("[optionalAuth] Error validating Supabase token:", err)
		req.user = null
		return next()
	}
}

export default auth