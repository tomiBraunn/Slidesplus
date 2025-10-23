import { pool } from "../config/database.js"
import { supabase } from "../services/supabaseService.js"

export const listProjects = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const q = await pool.query(
			`SELECT id, owner_id, name, document, created_at, updated_at
       FROM projects
       WHERE owner_id=$1
       ORDER BY updated_at DESC, created_at DESC`,
			[req.user.sub]
		)
		res.json(q.rows)
	} catch {
		res.status(500).json({ message: "Internal error" })
	}
}

export const getProject = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const q = await pool.query(
			`SELECT id, owner_id, name, document, chat_history, created_at, updated_at
       FROM projects
       WHERE id=$1 AND owner_id=$2`,
			[req.params.id, req.user.sub]
		)
		if (q.rowCount === 0) return res.status(404).json({ message: "Project not found" })
		res.json(q.rows[0])
	} catch {
		res.status(500).json({ message: "Internal error" })
	}
}

export const getSlides = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const projectId = req.params.id
		const projectCheck = await pool.query(`SELECT id FROM projects WHERE id=$1 AND owner_id=$2`, [projectId, req.user.sub])
		if (projectCheck.rowCount === 0) return res.status(404).json({ message: "Project not found" })

		const q = await pool.query(
			`SELECT id, project_id, position, html, created_at, updated_at
       FROM slides
       WHERE project_id=$1
       ORDER BY position ASC, created_at ASC`,
			[projectId]
		)
		res.json({ ok: true, slides: q.rows })
	} catch (err) {
		console.error("Error fetching slides:", err)
		res.status(500).json({ message: "Internal error", detail: err instanceof Error ? err.message : String(err) })
	}
}

export const saveSlides = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const projectId = req.params.id
		const { slides } = req.body ?? {}
		const projectCheck = await pool.query(`SELECT id FROM projects WHERE id=$1 AND owner_id=$2`, [projectId, req.user.sub])
		if (projectCheck.rowCount === 0) return res.status(404).json({ message: "Project not found" })
		if (!slides || !Array.isArray(slides) || slides.length === 0) return res.status(400).json({ message: "Missing slides array" })

		await pool.query(`DELETE FROM slides WHERE project_id=$1`, [projectId])
		const insertedSlides = []
		for (const slide of slides) {
			if (!slide.html) continue
			const q = await pool.query(
				`INSERT INTO slides (project_id, position, html)
         VALUES ($1, $2, $3)
         RETURNING id, project_id, position, html, created_at, updated_at`,
				[projectId, slide.position || 0, slide.html]
			)
			insertedSlides.push(q.rows[0])
		}
		res.status(201).json({ ok: true, slides: insertedSlides })
	} catch (err) {
		console.error("Error saving slides:", err)
		res.status(500).json({ message: "Internal error", detail: err instanceof Error ? err.message : String(err) })
	}
}

export const getChat = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const projectId = req.params.id
		const q = await pool.query(`SELECT chat_history FROM projects WHERE id=$1 AND owner_id=$2`, [projectId, req.user.sub])
		if (q.rowCount === 0) return res.status(404).json({ message: "Project not found" })
		const chatHistory = q.rows[0].chat_history || []
		res.json({ ok: true, messages: chatHistory })
	} catch (err) {
		console.error("Error fetching chat:", err)
		res.status(500).json({ message: "Internal error", detail: err instanceof Error ? err.message : String(err) })
	}
}

export const postChat = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const projectId = req.params.id
		const { role, content } = req.body ?? {}
		if (!role || !content) return res.status(400).json({ message: "Missing role or content" })
		if (!["user", "assistant"].includes(role)) return res.status(400).json({ message: "Invalid role" })

		const newMessage = { role, content, created_at: new Date().toISOString() }

		const q = await pool.query(
			`UPDATE projects 
       SET chat_history = COALESCE(chat_history, '[]'::jsonb) || $1::jsonb,
           updated_at = NOW()
       WHERE id=$2 AND owner_id=$3
       RETURNING chat_history`,
			[JSON.stringify(newMessage), projectId, req.user.sub]
		)
		if (q.rowCount === 0) return res.status(404).json({ message: "Project not found" })
		res.status(201).json({ ok: true, message: newMessage })
	} catch (err) {
		console.error("Error saving chat message:", err)
		res.status(500).json({ message: "Internal error", detail: err instanceof Error ? err.message : String(err) })
	}
}

export const clearChat = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const projectId = req.params.id
		const q = await pool.query(
			`UPDATE projects 
       SET chat_history = '[]'::jsonb,
           updated_at = NOW()
       WHERE id=$1 AND owner_id=$2
       RETURNING id`,
			[projectId, req.user.sub]
		)
		if (q.rowCount === 0) return res.status(404).json({ message: "Project not found" })
		res.json({ ok: true, message: "Chat history cleared" })
	} catch (err) {
		console.error("Error clearing chat:", err)
		res.status(500).json({ message: "Internal error", detail: err instanceof Error ? err.message : String(err) })
	}
}

export const uploadProjectFile = async (req, res) => {
	try {
		if (!req.file) return res.status(400).json({ message: "No file provided" })
		const projectId = req.params.id
		const projectCheck = await pool.query(`SELECT id FROM projects WHERE id=$1 AND owner_id=$2`, [projectId, req.user.sub])
		if (projectCheck.rowCount === 0) return res.status(404).json({ message: "Project not found" })

		const fileName = `${projectId}/${Date.now()}-${req.file.originalname}`
		const { error: uploadError } = await supabase.storage.from("slides-assets").upload(fileName, req.file.buffer, { contentType: req.file.mimetype })
		if (uploadError) return res.status(500).json({ message: "Error uploading file", detail: uploadError.message })

		const { data: { publicUrl } } = supabase.storage.from("slides-assets").getPublicUrl(fileName)
		res.json({ ok: true, url: publicUrl, filename: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype })
	} catch (error) {
		console.error("Error:", error)
		res.status(500).json({ message: "Internal error" })
	}
}

export const uploadChatFile = async (req, res) => {
	try {
		if (!req.file) return res.status(400).json({ message: "No file provided" })
		const fileName = `${req.user.sub}/${Date.now()}-${req.file.originalname}`
		const { error: uploadError } = await supabase.storage.from("chat-files").upload(fileName, req.file.buffer, { contentType: req.file.mimetype })
		if (uploadError) return res.status(500).json({ message: "Error uploading file", detail: uploadError.message })

		const { data: signedUrlData, error: signedError } = await supabase.storage.from("chat-files").createSignedUrl(fileName, 3600)
		if (signedError) return res.status(500).json({ message: "Error creating file URL" })

		res.json({ ok: true, url: signedUrlData.signedUrl, filename: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype })
	} catch (error) {
		console.error("Error:", error)
		res.status(500).json({ message: "Internal error" })
	}
}

export const createProject = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const { name, document = "" } = req.body ?? {}
		if (!name || !name.trim()) return res.status(400).json({ message: "Missing name" })
		const q = await pool.query(
			`INSERT INTO projects (owner_id, name, document)
       VALUES ($1,$2,$3)
       RETURNING id, owner_id, name, document, created_at, updated_at`,
			[req.user.sub, name.trim(), document]
		)
		res.status(201).json(q.rows[0])
	} catch (err) {
		if (err.code === "23505") return res.status(409).json({ message: "Name already exists" })
		res.status(500).json({ message: "Internal error" })
	}
}

export const updateProject = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const { id } = req.params
		const { name, document } = req.body ?? {}
		const fields = []
		const vals = []
		let i = 1
		if (typeof name === "string" && name.trim()) { fields.push(`name=$${i++}`); vals.push(name.trim()) }
		if (typeof document === "string") { fields.push(`document=$${i++}`); vals.push(document) }
		if (fields.length === 0) return res.status(400).json({ message: "No changes" })
		vals.push(id, req.user.sub)
		const q = await pool.query(
			`UPDATE projects
       SET ${fields.join(", ")}, updated_at=NOW()
       WHERE id=$${i++} AND owner_id=$${i}
       RETURNING id, owner_id, name, document, created_at, updated_at`,
			vals
		)
		if (q.rowCount === 0) return res.status(404).json({ message: "Project not found" })
		res.json(q.rows[0])
	} catch {
		res.status(500).json({ message: "Internal error" })
	}
}

export const deleteProject = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const { id } = req.params
		const q = await pool.query(`DELETE FROM projects WHERE id=$1 AND owner_id=$2 RETURNING id`, [id, req.user.sub])
		if (q.rowCount === 0) return res.status(404).json({ message: "Project not found" })
		res.json({ ok: true, id })
	} catch {
		res.status(500).json({ message: "Internal error" })
	}
}
