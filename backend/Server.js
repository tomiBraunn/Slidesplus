import "dotenv/config"
import express from "express"
import cors from "cors"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import pkg from "pg"

const { Pool } = pkg

const pool = process.env.DATABASE_URL
  ? new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { require: true, rejectUnauthorized: false },
  })
  : null

function generateAvatar(letter) {
  const l = (letter || "U").toUpperCase().slice(0, 1)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#6366F1"/><stop offset="1" stop-color="#22D3EE"/>` +
    `</linearGradient></defs>` +
    `<rect width="128" height="128" rx="64" fill="url(#g)"/>` +
    `<text x="50%" y="50%" dy=".36em" text-anchor="middle" fill="white" font-family="Inter, Arial, sans-serif" font-size="64" font-weight="700">` +
    l +
    `</text></svg>`
  const b64 = Buffer.from(svg, "utf8").toString("base64")
  return `data:image/svg+xml;base64,${b64}`
}

const app = express()
app.use(cors())
app.use(express.json({ limit: "4mb" }))

function auth(req, res, next) {
  const h = req.headers.authorization || ""
  const token = h.startsWith("Bearer ") ? h.slice(7) : null
  if (!token) return res.status(401).json({ message: "Missing token" })
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
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

app.get("/health", (_req, res) => res.json({ ok: true }))

app.get("/debug/routes", (_req, res) => {
  const routes = []
  app._router?.stack?.forEach((l) => {
    if (l.route?.path) {
      const methods = Object.keys(l.route.methods)
        .filter((m) => l.route.methods[m])
        .map((m) => m.toUpperCase())
        .join(",")
      routes.push(`${methods} ${l.route.path}`)
    }
  })
  res.json({ routes })
})

app.post("/createuser", async (req, res) => {
  if (!pool) return res.status(500).json({ message: "Database not configured" })
  try {
    const { username, email, password, first_name, last_name } = req.body ?? {}
    if (!username || !email || !password || !first_name || !last_name)
      return res.status(400).json({ message: "Missing fields" })
    const hashed = await bcrypt.hash(password, 10)
    const avatar = generateAvatar(String(username)[0] || "U")
    const q = await pool.query(
      `INSERT INTO users (username, email, password, first_name, last_name, avatar)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, username, email, first_name, last_name, avatar`,
      [username, email, hashed, first_name, last_name, avatar]
    )
    res.status(201).json({ ok: true, user: q.rows[0] })
  } catch (err) {
    if (err.code === "23505")
      return res.status(409).json({ message: "Username or email already exists" })
    res.status(500).json({ message: "Internal error" })
  }
})

app.post("/login", async (req, res) => {
  if (!pool) return res.status(500).json({ message: "Database not configured" })
  try {
    const { identifier, password } = req.body ?? {}
    if (!identifier || !password) return res.status(400).json({ message: "Missing fields" })
    const r = await pool.query(
      `SELECT id, username, email, password, first_name, last_name, avatar
       FROM users WHERE username=$1 OR email=$1`,
      [identifier]
    )
    if (r.rowCount === 0) return res.status(404).json({ message: "User not found" })
    const u = r.rows[0]
    const valid = await bcrypt.compare(password, u.password)
    if (!valid) return res.status(401).json({ message: "Invalid password" })
    if (!u.avatar || String(u.avatar).trim() === "") {
      const fix = generateAvatar(String(u.username)[0] || "U")
      await pool.query(`UPDATE users SET avatar=$1, updated_at=NOW() WHERE id=$2`, [fix, u.id])
      u.avatar = fix
    }
    const token = jwt.sign(
      { sub: u.id, username: u.username, email: u.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    )
    res.json({
      ok: true,
      user: {
        id: u.id,
        username: u.username,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        avatar: u.avatar,
      },
      token,
    })
  } catch {
    res.status(500).json({ message: "Internal error" })
  }
})

app.get("/me", auth, async (req, res) => {
  try {
    const q = await pool.query(
      `SELECT id, username, email, first_name, last_name, avatar FROM users WHERE id=$1`,
      [req.user.sub]
    )
    if (q.rowCount === 0) return res.status(404).json({ message: "User not found" })
    res.json({ ok: true, user: q.rows[0] })
  } catch {
    res.status(500).json({ message: "Internal error" })
  }
})

app.patch("/users/me/avatar/regenerate", auth, async (req, res) => {
  try {
    const q = await pool.query(`SELECT username FROM users WHERE id=$1`, [req.user.sub])
    if (q.rowCount === 0) return res.status(404).json({ message: "User not found" })
    const avatar = generateAvatar(String(q.rows[0].username)[0] || "U")
    const u = await pool.query(
      `UPDATE users SET avatar=$1, updated_at=NOW() WHERE id=$2
       RETURNING id, username, email, first_name, last_name, avatar`,
      [avatar, req.user.sub]
    )
    res.json({ ok: true, user: u.rows[0] })
  } catch {
    res.status(500).json({ message: "Internal error" })
  }
})

app.get("/projects", auth, async (req, res) => {
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
})

app.get("/projects/:id", auth, async (req, res) => {
  if (!pool) return res.status(500).json({ message: "Database not configured" })
  try {
    const q = await pool.query(
      `SELECT id, owner_id, name, document, created_at, updated_at
       FROM projects
       WHERE id=$1 AND owner_id=$2`,
      [req.params.id, req.user.sub]
    )
    if (q.rowCount === 0) return res.status(404).json({ message: "Project not found" })
    res.json(q.rows[0])
  } catch {
    res.status(500).json({ message: "Internal error" })
  }
})

app.get("/projects/:id/slides", auth, async (req, res) => {
  try {
    const slides = await pool.query(
      `SELECT id, position, html, created_at, updated_at
       FROM slides
       WHERE project_id=$1
       ORDER BY position ASC`,
      [req.params.id]
    )
    res.json({ ok: true, slides: slides.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal error" })
  }
})

app.post("/projects/:id/slides", auth, async (req, res) => {
  try {
    const { slides } = req.body ?? {}
    if (!Array.isArray(slides)) return res.status(400).json({ message: "Slides must be an array" })

    await pool.query(`DELETE FROM slides WHERE project_id=$1`, [req.params.id])

    for (let i = 0; i < slides.length; i++) {
      const html = slides[i]?.html || ""
      await pool.query(
        `INSERT INTO slides (project_id, position, html)
         VALUES ($1, $2, $3)`,
        [req.params.id, i, html]
      )
    }

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal error" })
  }
})

app.post("/projects", auth, async (req, res) => {
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
})

app.patch("/projects/:id", auth, async (req, res) => {
  if (!pool) return res.status(500).json({ message: "Database not configured" })
  try {
    const { id } = req.params
    const { name, document } = req.body ?? {}
    const fields = []
    const vals = []
    let i = 1
    if (typeof name === "string" && name.trim()) {
      fields.push(`name=$${i++}`)
      vals.push(name.trim())
    }
    if (typeof document === "string") {
      fields.push(`document=$${i++}`)
      vals.push(document)
    }
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
})

app.patch("/projects/:id/rename", auth, async (req, res) => {
  if (!pool) return res.status(500).json({ message: "Database not configured" })
  try {
    const { id } = req.params
    const { name } = req.body ?? {}
    if (!name || !name.trim()) return res.status(400).json({ message: "Missing name" })
    const q = await pool.query(
      `UPDATE projects
       SET name=$1, updated_at=NOW()
       WHERE id=$2 AND owner_id=$3
       RETURNING id, owner_id, name, document, created_at, updated_at`,
      [name.trim(), id, req.user.sub]
    )
    if (q.rowCount === 0) return res.status(404).json({ message: "Project not found" })
    res.json(q.rows[0])
  } catch {
    res.status(500).json({ message: "Internal error" })
  }
})

app.delete("/projects/:id", auth, async (req, res) => {
  if (!pool) return res.status(500).json({ message: "Database not configured" })
  try {
    const { id } = req.params
    const q = await pool.query(
      `DELETE FROM projects WHERE id=$1 AND owner_id=$2 RETURNING id`,
      [id, req.user.sub]
    )
    if (q.rowCount === 0) return res.status(404).json({ message: "Project not found" })
    res.json({ ok: true, id })
  } catch {
    res.status(500).json({ message: "Internal error" })
  }
})

app.post("/gemini", async (req, res) => {
  try {
    const { system, mode, message, history, context, model, image } = req.body ?? {}
    if (!message || !String(message).trim()) return res.status(400).json({ error: "Missing message" })
    const API_KEY = process.env.GEMINI_API_KEY
    if (!API_KEY) return res.status(500).json({ error: "Server misconfigured (GEMINI_API_KEY missing)" })
    const mdl = model || "gemini-1.5-flash-latest"
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${mdl}:generateContent?key=${API_KEY}`
    const parts = []
    if (system) parts.push({ text: `[SYSTEM]: ${String(system)}` })
    if (context) parts.push({ text: `[CONTEXT]: ${String(context).slice(-12000)}` })
    if (Array.isArray(history)) {
      for (const m of history) {
        if (!m || !m.role || !m.content) continue
        parts.push({ text: `[${String(m.role).toUpperCase()}]: ${String(m.content)}` })
      }
    }
    parts.push({ text: `[USER]: ${String(message)}` })
    if (mode) parts.push({ text: `[MODE]: ${String(mode)}` })
    if (image?.data && image?.mimeType) {
      parts.push({ inline_data: { mime_type: image.mimeType, data: image.data } })
    }
    const payload = { contents: [{ role: "user", parts }] }
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const raw = await r.text()
    if (!r.ok) {
      let details
      try { details = JSON.parse(raw) } catch { details = raw }
      return res.status(502).json({ error: "Gemini upstream error", status: r.status, details })
    }
    res.type("application/json").send(raw)
  } catch {
    res.status(500).json({ error: "Error connecting to Gemini" })
  }
})

const PORT = process.env.PORT || 8000
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
