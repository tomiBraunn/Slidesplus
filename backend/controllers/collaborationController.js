import { pool } from "../config/database.js"

export const getProjectAccess = async (req, res) => {
    try {
        const { projectId } = req.params
        const currentUserId = req.user.sub

        const projectQuery = `
      SELECT 
        p.id,
        p.name,
        p.visibility,
        p.owner_id,
        p.allow_comments,
        u.username as owner_username,
        u.first_name as owner_first_name,
        u.last_name as owner_last_name
      FROM projects p
      LEFT JOIN users u ON u.id = p.owner_id
      WHERE p.id = $1
    `
        const projectResult = await pool.query(projectQuery, [projectId])

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ ok: false, exists: false, error: "Project not found" })
        }

        const project = projectResult.rows[0]
        const isOwner = project.owner_id === currentUserId

        const collabQuery = `
      SELECT
        pc.user_id,
        u.username,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar,
        pc.role
      FROM project_collaborators pc
      JOIN users u ON u.id = pc.user_id
      WHERE pc.project_id = $1
      ORDER BY pc.joined_at ASC
    `
        const collabResult = await pool.query(collabQuery, [projectId])

        const userRole = collabResult.rows.find(c => c.user_id === currentUserId)?.role || null
        const hasAccess = isOwner || userRole || project.visibility === 'public'

        const collaborators = collabResult.rows.map(row => ({
            user_id: row.user_id,
            username: row.username,
            first_name: row.first_name,
            last_name: row.last_name,
            email: row.email,
            avatar: row.avatar,
            role: row.role
        }))

        res.json({
            ok: true,
            project: {
                id: project.id,
                name: project.name,
                visibility: project.visibility,
                allowComments: project.allow_comments,
                owner: {
                    id: project.owner_id,
                    username: project.owner_username,
                    firstName: project.owner_first_name,
                    lastName: project.owner_last_name
                }
            },
            userRole: isOwner ? 'owner' : userRole,
            hasAccess,
            collaborators: collaborators
        })
    } catch (error) {
        console.error("Error getting project access:", error)
        res.status(500).json({ ok: false, error: error.message })
    }
}

export const updateProjectVisibility = async (req, res) => {
    try {
        const { projectId } = req.params
        const { visibility, allowComments } = req.body
        const currentUserId = req.user.sub

        const ownerCheck = await pool.query(
            'SELECT owner_id FROM projects WHERE id = $1',
            [projectId]
        )

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({ ok: false, error: "Project not found" })
        }

        if (ownerCheck.rows[0].owner_id !== currentUserId) {
            return res.status(403).json({ ok: false, error: "Only owner can change visibility" })
        }

        // allow_comments solo se actualiza si el cliente lo envía; así el toggle
        // de visibilidad no lo sobreescribe con NULL.
        const query = `
      UPDATE projects
      SET visibility = COALESCE($1, visibility),
          allow_comments = COALESCE($2, allow_comments)
      WHERE id = $3
      RETURNING *
    `
        await pool.query(query, [visibility ?? null, allowComments ?? null, projectId])

        res.json({ ok: true })
    } catch (error) {
        console.error("Error updating visibility:", error)
        res.status(500).json({ ok: false, error: error.message })
    }
}

export const addCollaborator = async (req, res) => {
    try {
        const { projectId } = req.params
        const { username, role } = req.body
        const currentUserId = req.user.sub

        const ownerCheck = await pool.query(
            'SELECT owner_id FROM projects WHERE id = $1',
            [projectId]
        )

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({ ok: false, error: "Project not found" })
        }

        if (ownerCheck.rows[0].owner_id !== currentUserId) {
            return res.status(403).json({ ok: false, error: "Only owner can add collaborators" })
        }

        const userQuery = 'SELECT id FROM users WHERE username = $1'
        const userResult = await pool.query(userQuery, [username])

        if (userResult.rows.length === 0) {
            return res.status(404).json({ ok: false, error: "User not found" })
        }

        const userId = userResult.rows[0].id

        if (userId === currentUserId) {
            return res.status(400).json({ ok: false, error: "Cannot add yourself" })
        }

        const insertQuery = `
      INSERT INTO project_collaborators (project_id, user_id, added_by, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (project_id, user_id) DO UPDATE SET role = $4
      RETURNING *
    `
        await pool.query(insertQuery, [projectId, userId, currentUserId, role])

        const collabQuery = `
      SELECT
        pc.user_id,
        u.username,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar,
        pc.role
      FROM project_collaborators pc
      JOIN users u ON u.id = pc.user_id
      WHERE pc.project_id = $1
      ORDER BY pc.joined_at ASC
    `
        const collabResult = await pool.query(collabQuery, [projectId])

        const collaborators = collabResult.rows.map(row => ({
            user_id: row.user_id,
            username: row.username,
            first_name: row.first_name,
            last_name: row.last_name,
            email: row.email,
            avatar: row.avatar,
            role: row.role
        }))

        res.json({ ok: true, collaborators: collaborators })
    } catch (error) {
        console.error("Error adding collaborator:", error)
        res.status(500).json({ ok: false, error: error.message })
    }
}

export const removeCollaborator = async (req, res) => {
    try {
        const { projectId, userId } = req.params
        const currentUserId = req.user.sub

        const ownerCheck = await pool.query(
            'SELECT owner_id FROM projects WHERE id = $1',
            [projectId]
        )

        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({ ok: false, error: "Project not found" })
        }

        if (ownerCheck.rows[0].owner_id !== currentUserId) {
            return res.status(403).json({ ok: false, error: "Only owner can remove collaborators" })
        }

        await pool.query(
            'DELETE FROM project_collaborators WHERE project_id = $1 AND user_id = $2',
            [projectId, userId]
        )

        const collabQuery = `
      SELECT
        pc.user_id,
        u.username,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar,
        pc.role
      FROM project_collaborators pc
      JOIN users u ON u.id = pc.user_id
      WHERE pc.project_id = $1
      ORDER BY pc.joined_at ASC
    `
        const collabResult = await pool.query(collabQuery, [projectId])

        const collaborators = collabResult.rows.map(row => ({
            user_id: row.user_id,
            username: row.username,
            first_name: row.first_name,
            last_name: row.last_name,
            email: row.email,
            avatar: row.avatar,
            role: row.role
        }))

        res.json({ ok: true, collaborators: collaborators })
    } catch (error) {
        console.error("Error removing collaborator:", error)
        res.status(500).json({ ok: false, error: error.message })
    }
}