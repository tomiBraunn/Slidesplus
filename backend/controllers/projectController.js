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

		const projectQuery = await pool.query(
			`SELECT p.id, p.name, p.is_public, p.owner_id, u.email as owner_email,
			       COALESCE(u.username, u.first_name, u.email) as owner_name
			FROM projects p
			LEFT JOIN users u ON u.id = p.owner_id
			WHERE p.id = $1`,
			[id]
		)

		const project = projectQuery.rows[0]

		const collaboratorsQuery = await pool.query(
			`SELECT u.id, u.email, COALESCE(u.username, u.first_name, u.email) as name, pc.role
			FROM project_collaborators pc
			JOIN users u ON u.id = pc.user_id
			WHERE pc.project_id = $1`,
			[id]
		)

		return res.json({
			ok: true,
			exists: true,
			hasAccess,
			role: hasAccess ? role : null,
			project: {
				id: project.id,
				name: project.name,
				is_public: project.is_public,
				owner: {
					id: project.owner_id,
					email: project.owner_email,
					name: project.owner_name
				}
			},
			collaborators: collaboratorsQuery.rows
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
			SELECT DISTINCT p.id, p.owner_id, p.name, p.document, p.created_at, p.updated_at, p.visibility,
			       u.username as owner_username, u.email as owner_email, u.first_name as owner_first_name,
			       u.last_name as owner_last_name, u.avatar as owner_avatar
			FROM projects p
			LEFT JOIN users u ON u.id = p.owner_id
			LEFT JOIN project_collaborators pc ON pc.project_id = p.id
			WHERE p.owner_id = $1 OR pc.user_id = $1 OR p.visibility = 'public'
			ORDER BY p.updated_at DESC, p.created_at DESC
		`
		const projectsResult = await pool.query(query, [req.user.sub])

		// Get slide count and collaborators for each project
		const projectsWithDetails = await Promise.all(
			projectsResult.rows.map(async (project) => {
				// Get slide count
				const slideCountResult = await pool.query(
					`SELECT COUNT(*) as count FROM slides WHERE project_id = $1`,
					[project.id]
				)

				// Get collaborators
				const collaboratorsResult = await pool.query(
					`SELECT pc.user_id, u.username, u.email, u.first_name, u.last_name, u.avatar, pc.role
					FROM project_collaborators pc
					JOIN users u ON u.id = pc.user_id
					WHERE pc.project_id = $1
					ORDER BY pc.joined_at ASC`,
					[project.id]
				)

				return {
					id: project.id,
					owner_id: project.owner_id,
					name: project.name,
					document: project.document,
					created_at: project.created_at,
					updated_at: project.updated_at,
					visibility: project.visibility,
					slideCount: parseInt(slideCountResult.rows[0].count),
					owner: {
						id: project.owner_id,
						username: project.owner_username,
						email: project.owner_email,
						first_name: project.owner_first_name,
						last_name: project.owner_last_name,
						avatar: project.owner_avatar
					},
					collaborators: collaboratorsResult.rows.map(c => ({
						id: c.user_id,
						username: c.username,
						email: c.email,
						first_name: c.first_name,
						last_name: c.last_name,
						avatar: c.avatar,
						role: c.role
					}))
				}
			})
		)

		res.json(projectsWithDetails)
	} catch (err) {
		console.error("Error listing projects:", err)
		res.status(500).json({ message: "Internal error" })
	}
}

export const getProject = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const { id } = req.params
		const userId = req.user?.sub || null

		const projectQuery = await pool.query(
			`SELECT p.id, p.owner_id, p.name, p.document, p.chat_history, p.created_at, p.updated_at, p.visibility, p.is_public,
			       u.username as owner_username, u.email as owner_email, u.first_name as owner_first_name,
			       u.last_name as owner_last_name, u.avatar as owner_avatar
			FROM projects p
			LEFT JOIN users u ON u.id = p.owner_id
			WHERE p.id = $1`,
			[id]
		)

		if (projectQuery.rowCount === 0) {
			return res.status(404).json({ message: "Project not found" })
		}

		const project = projectQuery.rows[0]

		let hasAccess = project.is_public
		let role = null

		if (userId) {
			const isOwner = project.owner_id === userId
			if (isOwner) {
				hasAccess = true
				role = 'owner'
			} else {
				const collaboratorQuery = await pool.query(
					`SELECT role FROM project_collaborators
					WHERE project_id = $1 AND user_id = $2`,
					[id, userId]
				)
				if (collaboratorQuery.rowCount > 0) {
					hasAccess = true
					role = collaboratorQuery.rows[0].role
				} else if (project.visibility === 'public') {
					hasAccess = true
					role = 'viewer'
				}
			}
		}

		if (!hasAccess) {
			return res.status(403).json({
				message: "This project is private"
			})
		}

		const slidesQuery = await pool.query(
			`SELECT id, html, position
			FROM slides
			WHERE project_id = $1
			ORDER BY position ASC`,
			[id]
		)

		// Get collaborators
		const collaboratorsResult = await pool.query(
			`SELECT pc.user_id, u.username, u.email, u.first_name, u.last_name, u.avatar, pc.role
			FROM project_collaborators pc
			JOIN users u ON u.id = pc.user_id
			WHERE pc.project_id = $1
			ORDER BY pc.joined_at ASC`,
			[id]
		)

		res.json({
			id: project.id,
			owner_id: project.owner_id,
			name: project.name,
			document: project.document,
			chat_history: project.chat_history,
			created_at: project.created_at,
			updated_at: project.updated_at,
			visibility: project.visibility,
			is_public: project.is_public,
			user_role: role,
			owner: {
				id: project.owner_id,
				username: project.owner_username,
				email: project.owner_email,
				first_name: project.owner_first_name,
				last_name: project.owner_last_name,
				avatar: project.owner_avatar
			},
			collaborators: collaboratorsResult.rows.map(c => ({
				id: c.user_id,
				username: c.username,
				email: c.email,
				first_name: c.first_name,
				last_name: c.last_name,
				avatar: c.avatar,
				role: c.role
			})),
			slides: slidesQuery.rows || []
		})
	} catch (err) {
		console.error("Error fetching project:", err)
		res.status(500).json({ message: "Internal error" })
	}
}

export const getPublicProject = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const { id } = req.params
		const userId = req.user?.sub || null

		const projectQuery = await pool.query(
			`SELECT id, name, document, created_at, updated_at, is_public, owner_id
			FROM projects
			WHERE id = $1`,
			[id]
		)

		if (projectQuery.rowCount === 0) {
			return res.status(404).json({ ok: false, message: "Project not found" })
		}

		const project = projectQuery.rows[0]

		let hasAccess = project.is_public

		if (!hasAccess && userId) {
			const isOwner = project.owner_id === userId
			const collaboratorQuery = await pool.query(
				`SELECT user_id FROM project_collaborators
				WHERE project_id = $1 AND user_id = $2`,
				[id, userId]
			)
			hasAccess = isOwner || collaboratorQuery.rowCount > 0
		}

		if (!hasAccess) {
			return res.status(403).json({
				ok: false,
				message: "This project is private"
			})
		}

		const slidesQuery = await pool.query(
			`SELECT id, html, position
			FROM slides
			WHERE project_id = $1
			ORDER BY position ASC`,
			[id]
		)

		const { owner_id, ...projectData } = project

		res.json({
			ok: true,
			project: {
				...projectData,
				slides: slidesQuery.rows || []
			}
		})
	} catch (err) {
		console.error("Error fetching public project:", err)
		res.status(500).json({ ok: false, message: "Internal error" })
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

		// Use UPSERT to handle existing slides
		const upsertedSlides = []
		for (const slide of slides) {
			if (!slide.html) continue
			const q = await pool.query(
				`INSERT INTO slides (project_id, position, html, css, js)
				VALUES ($1, $2, $3, $4, $5)
				ON CONFLICT (project_id, position)
				DO UPDATE SET
					html = EXCLUDED.html,
					css = EXCLUDED.css,
					js = EXCLUDED.js,
					updated_at = NOW()
				RETURNING id, project_id, position, html, css, js, created_at, updated_at`,
				[projectId, slide.position || 0, slide.html, slide.css || null, slide.js || null]
			)
			upsertedSlides.push(q.rows[0])
		}

		// Delete slides that are no longer in the array (e.g., if user deleted slides)
		const positions = slides.map((s, i) => s.position !== undefined ? s.position : i)
		if (positions.length > 0) {
			await pool.query(
				`DELETE FROM slides WHERE project_id = $1 AND position NOT IN (${positions.map((_, i) => `$${i + 2}`).join(',')})`,
				[projectId, ...positions]
			)
		} else {
			await pool.query(`DELETE FROM slides WHERE project_id = $1`, [projectId])
		}

		res.status(201).json({ ok: true, slides: upsertedSlides })
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

export const updateProjectVisibility = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const { id } = req.params
		const { is_public } = req.body

		if (typeof is_public !== 'boolean') {
			return res.status(400).json({ ok: false, message: "is_public must be a boolean" })
		}

		const { hasAccess, role, exists } = await checkProjectAccess(id, req.user.sub)

		if (!exists) {
			return res.status(404).json({ ok: false, message: "Project not found" })
		}

		if (!hasAccess || role !== 'owner') {
			return res.status(403).json({ ok: false, message: "Only the owner can change visibility" })
		}

		const q = await pool.query(
			`UPDATE projects
			SET is_public = $1, updated_at = NOW()
			WHERE id = $2
			RETURNING id, name, is_public, created_at, updated_at`,
			[is_public, id]
		)

		if (q.rowCount === 0) {
			return res.status(404).json({ ok: false, message: "Project not found" })
		}

		res.json({ ok: true, project: q.rows[0] })
	} catch (err) {
		console.error("Error updating project visibility:", err)
		res.status(500).json({ ok: false, message: "Internal error" })
	}
}

/**
 * POST /projects/:projectId/auto-save
 * Auto-save project content (creates version in project_changes)
 */
export const autoSaveProject = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const { projectId } = req.params
		const { content } = req.body
		const userId = req.user.sub

		if (!content) {
			return res.status(400).json({ ok: false, message: "Content is required" })
		}

		// Check project access
		const { hasAccess } = await checkProjectAccess(projectId, userId, true)
		if (!hasAccess) {
			return res.status(403).json({ ok: false, message: "Access denied" })
		}

		// Check if content changed from last version
		const lastVersionQuery = await pool.query(
			`SELECT change_data->>'content' as content
			FROM project_changes
			WHERE project_id = $1
			ORDER BY created_at DESC
			LIMIT 1`,
			[projectId]
		)

		// If content is the same as last version, don't create new version
		if (lastVersionQuery.rowCount > 0 && lastVersionQuery.rows[0].content === content) {
			return res.json({ ok: true, message: "No changes detected", version_id: null })
		}

		// Count slides in the content
		const slideCount = (content.match(/<section/g) || []).length

		// Create new version
		const versionQuery = await pool.query(
			`INSERT INTO project_changes (project_id, user_id, change_type, change_data, created_at)
			VALUES ($1, $2, $3, $4, NOW())
			RETURNING id, created_at`,
			[
				projectId,
				userId,
				'auto_save',
				JSON.stringify({ content, slide_count: slideCount })
			]
		)

		// Also update the main project document
		await pool.query(
			`UPDATE projects
			SET document = $1, updated_at = NOW(), last_modified_by = $2, last_modified_at = NOW()
			WHERE id = $3`,
			[content, userId, projectId]
		)

		res.json({
			ok: true,
			version_id: versionQuery.rows[0].id,
			created_at: versionQuery.rows[0].created_at
		})
	} catch (err) {
		console.error("Error auto-saving project:", err)
		res.status(500).json({ ok: false, message: "Internal error" })
	}
}

/**
 * GET /projects/:projectId/versions
 * Get version history from project_changes
 */
export const getProjectVersions = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const { projectId } = req.params
		const userId = req.user.sub

		// Check project access
		const { hasAccess } = await checkProjectAccess(projectId, userId)
		if (!hasAccess) {
			return res.status(403).json({ ok: false, message: "Access denied" })
		}

		// Get all versions with user info
		const versionsQuery = await pool.query(
			`SELECT
				pc.id,
				pc.created_at,
				pc.change_data,
				u.id as user_id,
				u.username,
				u.first_name,
				u.last_name,
				u.avatar
			FROM project_changes pc
			JOIN users u ON u.id = pc.user_id
			WHERE pc.project_id = $1
			ORDER BY pc.created_at DESC`,
			[projectId]
		)

		const versions = versionsQuery.rows.map((v, index) => {
			const changeData = v.change_data
			const createdAt = new Date(v.created_at)
			const autoSaveName = `Auto-saved at ${createdAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`

			return {
				id: v.id,
				version_number: versionsQuery.rowCount - index,
				name: autoSaveName,
				created_at: v.created_at,
				username: v.username,
				first_name: v.first_name,
				last_name: v.last_name,
				avatar: v.avatar,
				slide_count: changeData.slide_count || 0,
				content: changeData.content // Include content for preview/restore
			}
		})

		res.json({ ok: true, versions })
	} catch (err) {
		console.error("Error fetching project versions:", err)
		res.status(500).json({ ok: false, message: "Internal error" })
	}
}

export const restoreProjectVersion = async (req, res) => {
	if (!pool) return res.status(500).json({ message: "Database not configured" })
	try {
		const { projectId, versionId } = req.params
		const userId = req.user.sub

		// Check project access
		const { hasAccess, isViewer } = await checkProjectAccess(projectId, userId, true)
		if (!hasAccess || isViewer) {
			return res.status(403).json({ ok: false, message: "Access denied. Only owners and editors can restore versions." })
		}

		// Get the version content
		const versionQuery = await pool.query(
			`SELECT change_data FROM project_changes WHERE id = $1 AND project_id = $2`,
			[versionId, projectId]
		)

		if (versionQuery.rowCount === 0) {
			return res.status(404).json({ ok: false, message: "Version not found" })
		}

		const changeData = versionQuery.rows[0].change_data
		const content = changeData.content

		if (!content) {
			return res.status(400).json({ ok: false, message: "Version has no content to restore" })
		}

		// Update the project document with the version content
		await pool.query(
			`UPDATE projects
			SET document = $1, updated_at = NOW(), last_modified_by = $2, last_modified_at = NOW()
			WHERE id = $3`,
			[content, userId, projectId]
		)

		res.json({ ok: true, message: "Version restored successfully" })
	} catch (err) {
		console.error("Error restoring project version:", err)
		res.status(500).json({ ok: false, message: "Internal error" })
	}
}