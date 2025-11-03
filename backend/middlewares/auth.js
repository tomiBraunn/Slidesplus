import jwt from "jsonwebtoken"
import { pool } from "../config/database.js"

export function auth(req, res, next) {
	const h = req.headers.authorization || ""
	const token = h.startsWith("Bearer ") ? h.slice(7) : null
	if (!token) return res.status(401).json({ message: "Missing token" })
	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET)
		if (!pool) return res.status(500).json({ message: "Database not configured" })
		pool
			.query("SELECT id FROM users WHERE id=$1", [payload.sub])
			.then((r) => {
				if (r.rowCount === 0) return res.status(401).json({ message: "User deleted" })
				req.user = payload
				next()
			})
			.catch(() => res.status(500).json({ message: "Error validating user" }))
	} catch {
		return res.status(401).json({ message: "Invalid token" })
	}
}

export function optionalAuth(req, res, next) {
	const h = req.headers.authorization || ""
	const token = h.startsWith("Bearer ") ? h.slice(7) : null

	if (!token) {
		req.user = null
		return next()
	}

	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET)
		if (!pool) {
			req.user = null
			return next()
		}

		pool
			.query("SELECT id FROM users WHERE id=$1", [payload.sub])
			.then((r) => {
				req.user = r.rowCount > 0 ? payload : null
				next()
			})
			.catch(() => {
				req.user = null
				next()
			})
	} catch {
		req.user = null
		next()
	}
}

export default auth