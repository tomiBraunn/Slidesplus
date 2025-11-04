import bcrypt from "bcrypt"
import { pool } from "../config/database.js"
import { supabase } from "../services/supabaseService.js"
import { generateAvatar } from "../services/avatarService.js"

export const getMe = async (req, res) => {
	try {
		const q = await pool.query(
			`SELECT id, username, email, first_name, last_name, avatar, user_number FROM users WHERE id=$1`,
			[req.user.sub]
		)
		if (q.rowCount === 0) return res.status(404).json({ message: "User not found" })
		res.json({ ok: true, user: q.rows[0] })
	} catch {
		res.status(500).json({ message: "Internal error" })
	}
}

export const updateMe = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const { first_name, last_name, username, current_password, new_password } = req.body ?? {}
		const userId = req.user.sub

		if (!first_name && !last_name && !username && !new_password) return res.status(400).json({ message: "No fields to update" })

		if (new_password) {
			if (!current_password) return res.status(400).json({ message: "Current password is required" })
			const userQuery = await pool.query(`SELECT password FROM users WHERE id=$1`, [userId])
			if (userQuery.rowCount === 0) return res.status(404).json({ message: "User not found" })
			const valid = await bcrypt.compare(current_password, userQuery.rows[0].password)
			if (!valid) return res.status(401).json({ message: "Invalid current password" })
		}

		const fields = []
		const values = []
		let paramCount = 1

		if (first_name) { fields.push(`first_name=$${paramCount++}`); values.push(first_name.trim()) }
		if (last_name) { fields.push(`last_name=$${paramCount++}`); values.push(last_name.trim()) }
		if (username) { fields.push(`username=$${paramCount++}`); values.push(username.trim()) }
		if (new_password) {
			const hashed = await bcrypt.hash(new_password, 10)
			fields.push(`password=$${paramCount++}`)
			values.push(hashed)
		}

		fields.push(`updated_at=NOW()`)
		values.push(userId)

		const query = `
      UPDATE users 
      SET ${fields.join(", ")}
      WHERE id=$${paramCount}
      RETURNING id, username, email, first_name, last_name, avatar, user_number
    `
		const result = await pool.query(query, values)
		if (result.rowCount === 0) return res.status(404).json({ message: "User not found" })
		res.json({ ok: true, user: result.rows[0] })
	} catch (err) {
		console.error("Error updating user:", err)
		if (err.code === "23505") return res.status(409).json({ message: "Username already exists" })
		res.status(500).json({ message: "Internal error" })
	}
}

export const uploadAvatar = async (req, res) => {
	try {
		if (!req.file) return res.status(400).json({ message: "No file provided" })
		const userId = req.user.sub
		const fileExt = req.file.originalname.split(".").pop()
		const fileName = `${userId}.${fileExt}`

		const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: true })
		if (uploadError) return res.status(500).json({ message: "Error uploading file", detail: uploadError.message })

		const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName)

		const q = await pool.query(
			`UPDATE users SET avatar=$1, updated_at=NOW() WHERE id=$2
       RETURNING id, username, email, first_name, last_name, avatar, user_number`,
			[publicUrl, userId]
		)
		if (q.rowCount === 0) return res.status(404).json({ message: "User not found" })
		res.json({ ok: true, user: q.rows[0] })
	} catch (error) {
		console.error("Error:", error)
		res.status(500).json({ message: "Internal error" })
	}
}

export const deleteAvatar = async (req, res) => {
	try {
		const userId = req.user.sub
		const current = await pool.query(`SELECT avatar FROM users WHERE id=$1`, [userId])

		if (current.rowCount > 0 && current.rows[0].avatar) {
			const avatarUrl = current.rows[0].avatar
			if (avatarUrl.includes("supabase.co/storage")) {
				const fileName = avatarUrl.split("/").pop()
				await supabase.storage.from("avatars").remove([fileName])
			}
		}

		const user = await pool.query(`SELECT username FROM users WHERE id=$1`, [userId])
		const avatar = await generateAvatar(String(user.rows[0].username)[0] || "U", userId)

		const q = await pool.query(
			`UPDATE users SET avatar=$1, updated_at=NOW() WHERE id=$2
       RETURNING id, username, email, first_name, last_name, avatar, user_number`,
			[avatar, userId]
		)
		res.json({ ok: true, user: q.rows[0] })
	} catch (error) {
		console.error("Error:", error)
		res.status(500).json({ message: "Internal error" })
	}
}

export const regenerateAvatar = async (req, res) => {
	try {
		const userId = req.user.sub
		const current = await pool.query(`SELECT avatar FROM users WHERE id=$1`, [userId])
		if (current.rowCount > 0 && current.rows[0].avatar) {
			const avatarUrl = current.rows[0].avatar
			if (avatarUrl.includes("supabase.co/storage")) {
				const fileName = avatarUrl.split("/").pop()
				await supabase.storage.from("avatars").remove([fileName])
			}
		}
		const q0 = await pool.query(`SELECT username FROM users WHERE id=$1`, [userId])
		if (q0.rowCount === 0) return res.status(404).json({ message: "User not found" })
		const avatar = await generateAvatar(String(q0.rows[0].username)[0] || "U", userId)
		const u = await pool.query(
			`UPDATE users SET avatar=$1, updated_at=NOW() WHERE id=$2
       RETURNING id, username, email, first_name, last_name, avatar, user_number`,
			[avatar, userId]
		)
		res.json({ ok: true, user: u.rows[0] })
	} catch {
		res.status(500).json({ message: "Internal error" })
	}
}

export const searchUsers = async (req, res) => {
	try {
		const { q } = req.query
		const currentUserId = req.user.sub

		if (!q || q.length < 2) {
			return res.json({ ok: true, users: [] })
		}

		const query = `
			SELECT 
				id,
				username,
				email,
				first_name,
				last_name,
				avatar
			FROM users
			WHERE 
				id != $1 AND
				(
					username ILIKE $2 OR
					email ILIKE $2 OR
					first_name ILIKE $2 OR
					last_name ILIKE $2 OR
					CONCAT(first_name, ' ', last_name) ILIKE $2
				)
			ORDER BY 
				CASE
					WHEN username ILIKE $2 THEN 1
					WHEN email ILIKE $2 THEN 2
					WHEN first_name ILIKE $2 THEN 3
					WHEN last_name ILIKE $2 THEN 4
					ELSE 5
				END
			LIMIT 10
		`

		const result = await pool.query(query, [currentUserId, `%${q}%`])

		res.json({ ok: true, users: result.rows })
	} catch (error) {
		console.error("Error searching users:", error)
		res.status(500).json({ ok: false, error: error.message })
	}
}