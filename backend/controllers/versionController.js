import { pool } from "../config/database.js"

export const createVersion = async (req, res) => {
  if (!pool) return res.status(500).json({ message: "Database not configured" })
  
  try {
    const { projectId } = req.params
    const { name, metadata } = req.body
    const userId = req.user.sub

    const projectRes = await pool.query(
      `SELECT p.id, p.name, p.document, p.owner_id,
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'position', s.position,
              'html', s.html
            ) ORDER BY s.position
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'
        ) as slides
      FROM projects p
      LEFT JOIN slides s ON s.project_id = p.id
      WHERE p.id = $1
      GROUP BY p.id`,
      [projectId]
    )

    if (projectRes.rows.length === 0) {
      return res.status(404).json({ message: "Project not found" })
    }

    const project = projectRes.rows[0]

    if (project.owner_id !== userId) {
      const collabRes = await pool.query(
        `SELECT role FROM project_collaborators 
         WHERE project_id = $1 AND user_id = $2`,
        [projectId, userId]
      )
      if (collabRes.rows.length === 0 || collabRes.rows[0].role === 'viewer') {
        return res.status(403).json({ message: "No permission to create versions" })
      }
    }

    const versionRes = await pool.query(
      `INSERT INTO project_versions 
       (project_id, name, document, slides, created_by, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        projectId,
        name || `Version ${new Date().toLocaleString()}`,
        project.document,
        JSON.stringify(project.slides),
        userId,
        metadata || {}
      ]
    )

    res.status(201).json({ ok: true, version: versionRes.rows[0] })
  } catch (err) {
    console.error("Error creating version:", err)
    res.status(500).json({ message: "Internal error" })
  }
}

export const listVersions = async (req, res) => {
  if (!pool) return res.status(500).json({ message: "Database not configured" })
  
  try {
    const { projectId } = req.params
    const userId = req.user.sub

    const accessRes = await pool.query(
      `SELECT p.owner_id, pc.role
       FROM projects p
       LEFT JOIN project_collaborators pc ON pc.project_id = p.id AND pc.user_id = $2
       WHERE p.id = $1`,
      [projectId, userId]
    )

    if (accessRes.rows.length === 0) {
      return res.status(404).json({ message: "Project not found" })
    }

    const { owner_id, role } = accessRes.rows[0]
    if (owner_id !== userId && !role) {
      return res.status(403).json({ message: "Access denied" })
    }

    const versionsRes = await pool.query(
      `SELECT 
        v.id,
        v.project_id,
        v.version_number,
        v.name,
        v.created_at,
        v.metadata,
        u.username,
        u.first_name,
        u.last_name,
        u.avatar,
        jsonb_array_length(v.slides) as slide_count
       FROM project_versions v
       LEFT JOIN users u ON u.id = v.created_by
       WHERE v.project_id = $1
       ORDER BY v.created_at DESC`,
      [projectId]
    )

    res.json({ ok: true, versions: versionsRes.rows })
  } catch (err) {
    console.error("Error listing versions:", err)
    res.status(500).json({ message: "Internal error" })
  }
}

export const getVersion = async (req, res) => {
  if (!pool) return res.status(500).json({ message: "Database not configured" })
  
  try {
    const { projectId, versionId } = req.params
    const userId = req.user.sub

    const accessRes = await pool.query(
      `SELECT p.owner_id, pc.role
       FROM projects p
       LEFT JOIN project_collaborators pc ON pc.project_id = p.id AND pc.user_id = $2
       WHERE p.id = $1`,
      [projectId, userId]
    )

    if (accessRes.rows.length === 0) {
      return res.status(404).json({ message: "Project not found" })
    }

    const { owner_id, role } = accessRes.rows[0]
    if (owner_id !== userId && !role) {
      return res.status(403).json({ message: "Access denied" })
    }

    const versionRes = await pool.query(
      `SELECT 
        v.*,
        u.username,
        u.first_name,
        u.last_name,
        u.avatar
       FROM project_versions v
       LEFT JOIN users u ON u.id = v.created_by
       WHERE v.id = $1 AND v.project_id = $2`,
      [versionId, projectId]
    )

    if (versionRes.rows.length === 0) {
      return res.status(404).json({ message: "Version not found" })
    }

    res.json({ ok: true, version: versionRes.rows[0] })
  } catch (err) {
    console.error("Error getting version:", err)
    res.status(500).json({ message: "Internal error" })
  }
}

export const restoreVersion = async (req, res) => {
  if (!pool) return res.status(500).json({ message: "Database not configured" })
  
  try {
    const { projectId, versionId } = req.params
    const userId = req.user.sub

    const projectRes = await pool.query(
      `SELECT owner_id FROM projects WHERE id = $1`,
      [projectId]
    )

    if (projectRes.rows.length === 0) {
      return res.status(404).json({ message: "Project not found" })
    }

    if (projectRes.rows[0].owner_id !== userId) {
      const collabRes = await pool.query(
        `SELECT role FROM project_collaborators 
         WHERE project_id = $1 AND user_id = $2`,
        [projectId, userId]
      )
      if (collabRes.rows.length === 0 || collabRes.rows[0].role === 'viewer') {
        return res.status(403).json({ message: "Only owner/editors can restore versions" })
      }
    }

    const versionRes = await pool.query(
      `SELECT document, slides FROM project_versions 
       WHERE id = $1 AND project_id = $2`,
      [versionId, projectId]
    )

    if (versionRes.rows.length === 0) {
      return res.status(404).json({ message: "Version not found" })
    }

    const { document, slides } = versionRes.rows[0]

    await pool.query('BEGIN')

    await pool.query(
      `UPDATE projects 
       SET document = $1, updated_at = NOW() 
       WHERE id = $2`,
      [document, projectId]
    )

    await pool.query('DELETE FROM slides WHERE project_id = $1', [projectId])

    const parsedSlides = typeof slides === 'string' ? JSON.parse(slides) : slides
    for (const slide of parsedSlides) {
      await pool.query(
        `INSERT INTO slides (project_id, position, html)
         VALUES ($1, $2, $3)`,
        [projectId, slide.position, slide.html]
      )
    }

    await pool.query('COMMIT')

    res.json({ ok: true, message: "Version restored successfully" })
  } catch (err) {
    await pool.query('ROLLBACK')
    console.error("Error restoring version:", err)
    res.status(500).json({ message: "Internal error" })
  }
}

export const deleteVersion = async (req, res) => {
  if (!pool) return res.status(500).json({ message: "Database not configured" })
  
  try {
    const { projectId, versionId } = req.params
    const userId = req.user.sub

    const projectRes = await pool.query(
      `SELECT owner_id FROM projects WHERE id = $1`,
      [projectId]
    )

    if (projectRes.rows.length === 0) {
      return res.status(404).json({ message: "Project not found" })
    }

    if (projectRes.rows[0].owner_id !== userId) {
      return res.status(403).json({ message: "Only owner can delete versions" })
    }

    const deleteRes = await pool.query(
      `DELETE FROM project_versions 
       WHERE id = $1 AND project_id = $2 
       RETURNING id`,
      [versionId, projectId]
    )

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ message: "Version not found" })
    }

    res.json({ ok: true, message: "Version deleted" })
  } catch (err) {
    console.error("Error deleting version:", err)
    res.status(500).json({ message: "Internal error" })
  }
}