import { pool } from "../config/database.js"
import { supabase } from "../services/supabaseService.js"

const checkProjectAccess = async (projectId, userId, requireEdit = false) => {
	const query = `
		SELECT 
			p.id,
			p.owner_id,
			p.visibility,
			CASE 
				WHEN p.owner_id = $2 THEN 'owner'
				WHEN pc.role IS NOT NULL THEN pc.role
				WHEN p.visibility = 'public' THEN 'viewer'
				ELSE NULL
			END as user_role
		FROM projects p
		LEFT JOIN project_collaborators pc ON pc.project_id = p.id AND pc.user_id = $2
		WHERE p.id = $1
	`
	const result = await pool.query(query, [projectId, userId])

	if (result.rows.length === 0) return { hasAccess: false, role: null, exists: false }

	const { user_role } = result.rows[0]
	if (!user_role) return { hasAccess: false, role: null, exists: true }

	if (requireEdit && user_role === 'viewer') {
		return { hasAccess: false, role: user_role, isViewer: true, exists: true }
	}

	return { hasAccess: true, role: user_role, exists: true }
}

export const checkAccess = async (req, res) => {
	if (!pool) return res.status(500).json({ ok: false, message: "Database not configured" })
	try {
		const { id } = req.params
		const userId = req.user.sub

		const { hasAccess, role, exists } = await checkProjectAccess(id, userId)

		if (!exists) {
			return res.status(404).json({
				ok: false,
				exists: false,
				hasAccess: false,
				message: "Project not found"
			})
		}

		return res.json({
			ok: true,
			exists: true,
			hasAccess,
			role: hasAccess ? role : null
		})
	} catch (err) {
		console.error("Error checking project access:", err)
		res.status(500).json({
			ok: false,
			exists: false,
			hasAccess: false,
			message: "Internal error"
		})
	}
}

export const listProjects = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const query = `
			SELECT DISTINCT p.id, p.owner_id, p.name, p.document, p.created_at, p.updated_at, p.visibility
			FROM projects p
			LEFT JOIN project_collaborators pc ON pc.project_id = p.id
			WHERE p.owner_id = $1 OR pc.user_id = $1 OR p.visibility = 'public'
			ORDER BY p.updated_at DESC, p.created_at DESC
		`
		const q = await pool.query(query, [req.user.sub])
		res.json(q.rows)
	} catch {
		res.status(500).json({ message: "Internal error" })
	}
}

export const getProject = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const { hasAccess, role, exists } = await checkProjectAccess(req.params.id, req.user.sub)

		if (!exists) {
			return res.status(404).json({ message: "Project not found" })
		}

		if (!hasAccess) {
			return res.status(403).json({ message: "Access denied" })
		}

		const q = await pool.query(
			`SELECT id, owner_id, name, document, chat_history, created_at, updated_at, visibility
			FROM projects
			WHERE id=$1`,
			[req.params.id]
		)

		if (q.rowCount === 0) return res.status(404).json({ message: "Project not found" })

		res.json({ ...q.rows[0], user_role: role })
	} catch {
		res.status(500).json({ message: "Internal error" })
	}
}

export const getSlides = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const projectId = req.params.id
		const { hasAccess, exists } = await checkProjectAccess(projectId, req.user.sub)

		if (!exists) {
			return res.status(404).json({ message: "Project not found" })
		}

		if (!hasAccess) {
			return res.status(403).json({ message: "Access denied" })
		}

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
		let { slides } = req.body ?? {}

		if ((!slides || !Array.isArray(slides) || slides.length === 0) && typeof req.body.document === "string") {
			const sections = req.body.document.match(/<section[\s\S]*?<\/section>/gi) || []
			slides = sections.map((html, i) => ({ html, position: i }))
		}

		if ((!slides || !Array.isArray(slides) || slides.length === 0) && typeof req.body.html === "string") {
			const sections = req.body.html.match(/<section[\s\S]*?<\/section>/gi) || []
			slides = sections.map((html, i) => ({ html, position: i }))
		}

		if (!slides || !Array.isArray(slides) || slides.length === 0) {
			console.warn(`saveSlides: no slides provided for project ${projectId}`, { bodySample: Object.keys(req.body).slice(0, 10) })
			return res.status(400).json({ message: "Missing slides array or document to extract slides from" })
		}

		const projectCheck = await pool.query(`SELECT id FROM projects WHERE id=$1 AND owner_id=$2`, [projectId, req.user.sub])
		if (projectCheck.rowCount === 0) return res.status(404).json({ message: "Project not found" })

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
		const { hasAccess, exists } = await checkProjectAccess(projectId, req.user.sub)

		if (!exists) {
			return res.status(404).json({ message: "Project not found" })
		}

		if (!hasAccess) {
			return res.status(403).json({ message: "Access denied" })
		}

		const q = await pool.query(`SELECT chat_history FROM projects WHERE id=$1`, [projectId])
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
		const { role, content, attachments, previewSlides } = req.body ?? {}

		const { hasAccess, isViewer, exists } = await checkProjectAccess(projectId, req.user.sub, true)

		if (!exists) {
			return res.status(404).json({ message: "Project not found" })
		}

		if (!hasAccess || isViewer) {
			return res.status(403).json({ message: "You don't have permission to chat in this project" })
		}

		if (!role || !content) return res.status(400).json({ message: "Missing role or content" })
		if (!["user", "assistant"].includes(role)) return res.status(400).json({ message: "Invalid role" })

		const newMessage = {
			role,
			content,
			attachments: attachments || null,
			previewSlides: previewSlides || null,
			created_at: new Date().toISOString()
		}

		const q = await pool.query(
			`UPDATE projects 
			SET chat_history = COALESCE(chat_history, '[]'::jsonb) || $1::jsonb,
				updated_at = NOW()
			WHERE id=$2
			RETURNING chat_history`,
			[JSON.stringify(newMessage), projectId]
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
		const { hasAccess, role, exists } = await checkProjectAccess(projectId, req.user.sub, true)

		if (!exists) {
			return res.status(404).json({ message: "Project not found" })
		}

		if (!hasAccess || role !== 'owner') {
			return res.status(403).json({ message: "Only the owner can clear chat history" })
		}

		const q = await pool.query(
			`UPDATE projects 
			SET chat_history = '[]'::jsonb,
				updated_at = NOW()
			WHERE id=$1
			RETURNING id`,
			[projectId]
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
		if (!req.file) {
			return res.status(400).json({ message: "No file provided" })
		}

		const projectId = req.params.id
		const { hasAccess, isViewer, exists } = await checkProjectAccess(projectId, req.user.sub, true)

		if (!exists) {
			return res.status(404).json({ message: "Project not found" })
		}

		if (!hasAccess || isViewer) {
			return res.status(403).json({ message: "You don't have permission to upload files" })
		}

		const bucketName = "chat-files"
		const sanitizedFileName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')
		const fileName = `${projectId}/${Date.now()}-${sanitizedFileName}`

		console.log("Uploading file:", { bucketName, fileName, size: req.file.size })

		const { error: uploadError } = await supabase.storage
			.from(bucketName)
			.upload(fileName, req.file.buffer, {
				contentType: req.file.mimetype,
				upsert: false
			})

		if (uploadError) {
			console.error("Supabase upload error:", uploadError)
			return res.status(500).json({
				message: "Error uploading file to storage",
				detail: uploadError.message
			})
		}

		const { data: { publicUrl } } = supabase.storage
			.from(bucketName)
			.getPublicUrl(fileName)

		console.log("Upload successful:", publicUrl)

		res.json({
			ok: true,
			url: publicUrl,
			filename: req.file.originalname,
			size: req.file.size,
			mimetype: req.file.mimetype
		})
	} catch (error) {
		console.error("Error uploading file:", error)
		res.status(500).json({
			message: "Internal server error",
			detail: error.message
		})
	}
}

export const uploadChatFile = async (req, res) => {
	try {
		if (!req.file) return res.status(400).json({ message: "No file provided" })
		const projectId = req.params.id

		const { hasAccess, isViewer, exists } = await checkProjectAccess(projectId, req.user.sub, true)

		if (!exists) {
			return res.status(404).json({ message: "Project not found" })
		}

		if (!hasAccess || isViewer) {
			return res.status(403).json({ message: "You don't have permission to upload files" })
		}

		const fileName = `${projectId}/${Date.now()}-${req.file.originalname}`
		const { error: uploadError } = await supabase.storage
			.from("chat-files")
			.upload(fileName, req.file.buffer, { contentType: req.file.mimetype })

		if (uploadError) {
			return res.status(500).json({ message: "Error uploading file", detail: uploadError.message })
		}

		const { data: { publicUrl } } = supabase.storage
			.from("chat-files")
			.getPublicUrl(fileName)

		res.json({
			ok: true,
			url: publicUrl,
			filename: req.file.originalname,
			size: req.file.size,
			mimetype: req.file.mimetype
		})
	} catch (error) {
		console.error("Error uploading chat file:", error)
		res.status(500).json({ message: "Internal error" })
	}
}

export const createProject = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const { name, document = "" } = req.body ?? {}
		if (!name || !name.trim()) return res.status(400).json({ message: "Missing name" })
		const q = await pool.query(
			`INSERT INTO projects (owner_id, name, document, visibility)
			VALUES ($1,$2,$3,'private')
			RETURNING id, owner_id, name, document, created_at, updated_at, visibility`,
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

		const { hasAccess, role, exists } = await checkProjectAccess(id, req.user.sub, true)

		if (!exists) {
			return res.status(404).json({ message: "Project not found" })
		}

		if (!hasAccess || role === 'viewer') {
			return res.status(403).json({ message: "You don't have permission to update this project" })
		}

		const fields = []
		const vals = []
		let i = 1
		if (typeof name === "string" && name.trim()) { fields.push(`name=$${i++}`); vals.push(name.trim()) }
		if (typeof document === "string") { fields.push(`document=$${i++}`); vals.push(document) }
		if (fields.length === 0) return res.status(400).json({ message: "No changes" })
		vals.push(id)
		const q = await pool.query(
			`UPDATE projects
			SET ${fields.join(", ")}, updated_at=NOW()
			WHERE id=$${i++}
			RETURNING id, owner_id, name, document, created_at, updated_at, visibility`,
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
		const { hasAccess, role, exists } = await checkProjectAccess(id, req.user.sub)

		if (!exists) {
			return res.status(404).json({ message: "Project not found" })
		}

		if (!hasAccess || role !== 'owner') {
			return res.status(403).json({ message: "Only the owner can delete this project" })
		}

		const q = await pool.query(`DELETE FROM projects WHERE id=$1 AND owner_id=$2 RETURNING id`, [id, req.user.sub])
		if (q.rowCount === 0) return res.status(404).json({ message: "Project not found" })
		res.json({ ok: true, id })
	} catch {
		res.status(500).json({ message: "Internal error" })
	}
}