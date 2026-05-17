import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { pool } from "../config/database.js"
import { generateAvatar } from "../services/avatarService.js"

export const createUser = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const { username, email, password, first_name, last_name } = req.body ?? {}
		if (!username || !email || !password || !first_name || !last_name)
			return res.status(400).json({ message: "Missing fields" })

		const hashed = await bcrypt.hash(password, 10)

		// First create user without avatar to get the ID
		const q = await pool.query(
			`INSERT INTO users (username, email, password, first_name, last_name)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id, username, email, first_name, last_name, avatar, user_number`,
			[username, email, hashed, first_name, last_name]
		)

		const userId = q.rows[0].id
		const avatar = await generateAvatar(String(username)[0] || "U", userId)

		// Update user with avatar URL
		await pool.query(`UPDATE users SET avatar=$1, updated_at=NOW() WHERE id=$2`, [avatar, userId])
		q.rows[0].avatar = avatar

		res.status(201).json({ ok: true, user: q.rows[0] })
	} catch (err) {
		console.error("ERROR CREATING USER:", err)
		if (err.code === "23505") return res.status(409).json({ message: "Username or email already exists" })
		res.status(500).json({ message: "Internal error", detail: err.message })
	}
}

export const registerUser = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const { id, email, username, password, first_name, last_name } = req.body ?? {}
		if (!id || !email || !password) return res.status(400).json({ message: "Missing required fields: id, email, password" })

		const hashed = await bcrypt.hash(password, 10)

		// Upsert: insert new user or update if already exists (from Supabase email verification)
		const q = await pool.query(
			`INSERT INTO users (id, email, username, password, first_name, last_name)
			 VALUES ($1, $2, $3, $4, $5, $6)
			 ON CONFLICT(id) DO UPDATE SET
			   password = EXCLUDED.password,
			   email = EXCLUDED.email,
			   username = EXCLUDED.username,
			   first_name = EXCLUDED.first_name,
			   last_name = EXCLUDED.last_name,
			   updated_at = NOW()
			 RETURNING id, username, email, first_name, last_name`,
			[id, email, username, hashed, first_name, last_name]
		)

		res.json({
			ok: true,
			user: q.rows[0],
			message: "Password saved. Please verify your email to complete registration."
		})
	} catch (err) {
		console.error("ERROR REGISTERING USER:", err)
		if (err.code === "23505") return res.status(409).json({ message: "Email already exists" })
		res.status(500).json({ message: "Internal error", detail: err.message })
	}
}

export const syncPassword = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const { new_password } = req.body ?? {}
		if (!new_password || String(new_password).trim().length < 6) {
			return res.status(400).json({ message: "New password must be at least 6 characters" })
		}

		const hashed = await bcrypt.hash(new_password, 10)
		const result = await pool.query(
			`UPDATE users SET password=$1, updated_at=NOW() WHERE id=$2 RETURNING id`,
			[hashed, req.user.sub]
		)

		if (result.rowCount === 0) return res.status(404).json({ message: "User not found" })
		return res.json({ ok: true, message: "Password synced" })
	} catch (err) {
		console.error("ERROR SYNCING PASSWORD:", err)
		return res.status(500).json({ message: "Internal error" })
	}
}

export const login = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const { identifier, password } = req.body ?? {}
		if (!identifier || !password) return res.status(400).json({ message: "Missing fields" })

		const r = await pool.query(
			`SELECT id, username, email, password, first_name, last_name, avatar, user_number
         FROM users WHERE username=$1 OR email=$1`,
			[identifier]
		)
		if (r.rowCount === 0) return res.status(404).json({ message: "User not found" })

		const u = r.rows[0]
		const valid = await bcrypt.compare(password, u.password)
		if (!valid) return res.status(401).json({ message: "Invalid password" })

		if (!u.avatar || String(u.avatar).trim() === "") {
			const fix = await generateAvatar(String(u.username)[0] || "U", u.id)
			await pool.query(`UPDATE users SET avatar=$1, updated_at=NOW() WHERE id=$2`, [fix, u.id])
			u.avatar = fix
		}

		const token = jwt.sign({ sub: u.id, username: u.username, email: u.email }, process.env.JWT_SECRET, { expiresIn: "1d" })

		res.json({
			ok: true,
			user: {
				id: u.id,
				username: u.username,
				email: u.email,
				first_name: u.first_name,
				last_name: u.last_name,
				avatar: u.avatar,
				user_number: u.user_number
			},
			token
		})
	} catch {
		res.status(500).json({ message: "Internal error" })
	}
}
