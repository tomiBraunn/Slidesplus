import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import pkg from "pg";

const { Pool } = pkg;

// ---- Chequeos de entorno (para no fallar silencioso) ----
if (!process.env.DATABASE_URL) console.error("[BOOT] Falta DATABASE_URL en .env");
if (!process.env.JWT_SECRET) console.error("[BOOT] Falta JWT_SECRET en .env");
if (!process.env.GEMINI_API_KEY) console.warn("[BOOT] Falta GEMINI_API_KEY (solo afecta /gemini)");

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { require: true, rejectUnauthorized: false },
    })
  : null;

const app = express();
app.use(cors());
app.use(express.json({ limit: "4mb" }));

// ---- Health / raíz ----
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    env: {
      hasDB: !!process.env.DATABASE_URL,
      hasJWT: !!process.env.JWT_SECRET,
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      node: process.version,
    },
  });
});

app.get("/", (req, res) => {
  res.json({ msg: "API funcionando" });
});

// ---- Auth middleware ----
function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Falta token" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }
}

// ---- Users ----
app.post("/createuser", async (req, res) => {
  if (!pool) return res.status(500).json({ message: "Database not configured" });
  try {
    const { username, email, password, first_name, last_name } = req.body ?? {};
    if (!username || !email || !password || !first_name || !last_name)
      return res.status(400).json({ message: "Missing fields" });

    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (username, email, password, first_name, last_name)
       VALUES ($1,$2,$3,$4,$5)`,
      [username, email, hashed, first_name, last_name]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.code === "23505")
      return res.status(409).json({ message: "Usuario o email ya existe" });
    console.error("createuser error:", err);
    res.status(500).json({ message: "Error interno" });
  }
});

app.post("/login", async (req, res) => {
  if (!pool) return res.status(500).json({ message: "Database not configured" });
  try {
    const { identifier, password } = req.body ?? {};
    if (!identifier || !password) return res.status(400).json({ message: "Missing fields" });

    const r = await pool.query(
      `SELECT id, username, email, password, first_name, last_name
       FROM users WHERE username=$1 OR email=$1`,
      [identifier]
    );
    if (r.rowCount === 0) return res.status(404).json({ message: "User not found" });

    const u = r.rows[0];
    const valid = await bcrypt.compare(password, u.password);
    if (!valid) return res.status(401).json({ message: "Clave inválida" });

    const token = jwt.sign(
      { sub: u.id, username: u.username, email: u.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      ok: true,
      user: {
        id: u.id,
        username: u.username,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
      },
      token,
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ message: "Error interno" });
  }
});

app.get("/me", auth, (req, res) => res.json({ ok: true, user: req.user }));

// ---- Projects ----
app.get("/projects", auth, async (req, res) => {
  if (!pool) return res.status(500).json({ message: "Database not configured" });
  try {
    const q = await pool.query(
      `SELECT id, owner_id, name, created_at, updated_at
       FROM projects
       WHERE owner_id=$1
       ORDER BY updated_at DESC, created_at DESC`,
      [req.user.sub]
    );
    res.json(q.rows);
  } catch (err) {
    console.error("projects list error:", err);
    res.status(500).json({ message: "Error interno" });
  }
});

app.get("/projects/:id", auth, async (req, res) => {
  if (!pool) return res.status(500).json({ message: "Database not configured" });
  try {
    const q = await pool.query(
      `SELECT id, owner_id, name, document, created_at, updated_at
         FROM projects
         WHERE id = $1 AND owner_id = $2`,
      [req.params.id, req.user.sub]
    );
    if (q.rowCount === 0) return res.status(404).json({ message: "Proyecto no encontrado" });
    res.json(q.rows[0]);
  } catch (err) {
    console.error("projects get error:", err);
    res.status(500).json({ message: "Error interno" });
  }
});

app.post("/projects", auth, async (req, res) => {
  if (!pool) return res.status(500).json({ message: "Database not configured" });
  try {
    const { name, document = "" } = req.body ?? {};
    if (!name || !name.trim()) return res.status(400).json({ message: "Falta nombre" });

    const q = await pool.query(
      `INSERT INTO projects (owner_id, name)
       VALUES ($1,$2)
       RETURNING id, owner_id, name, created_at, updated_at`,
      [req.user.sub, name.trim()]
    );
    res.status(201).json(q.rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ message: "Nombre ya existe" });
    console.error("projects create error:", err);
    res.status(500).json({ message: "Error interno" });
  }
});

app.patch("/projects/:id", auth, async (req, res) => {
  if (!pool) return res.status(500).json({ message: "DB no configurada" });
  try {
    const { id } = req.params;
    const { name, document } = req.body ?? {};

    const fields = [];
    const vals = [];
    let i = 1;
    if (typeof name === "string" && name.trim()) {
      fields.push(`name=$${i++}`);
      vals.push(name.trim());
    }
    if (typeof document === "string") {
      fields.push(`document=$${i++}`);
      vals.push(document);
    }
    if (fields.length === 0) return res.status(400).json({ message: "Sin cambios" });

    vals.push(id, req.user.sub);

    const q = await pool.query(
      `UPDATE projects
         SET ${fields.join(", ")}, updated_at = NOW()
         WHERE id = $${i++} AND owner_id = $${i}
         RETURNING id, owner_id, name, document, created_at, updated_at`,
      vals
    );
    if (q.rowCount === 0) return res.status(404).json({ message: "Proyecto no encontrado" });
    res.json(q.rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ message: "Nombre ya existe" });
    console.error("projects patch error:", err);
    res.status(500).json({ message: "Error interno" });
  }
});

app.patch("/projects/:id/rename", auth, async (req, res) => {
  if (!pool) return res.status(500).json({ message: "Database not configured" });
  try {
    const { name } = req.body ?? {};
    if (!name || !name.trim()) return res.status(400).json({ message: "Falta nombre" });

    const q = await pool.query(
      `UPDATE projects
       SET name=$1, updated_at=NOW()
       WHERE id=$2 AND owner_id=$3
       RETURNING id, owner_id, name, created_at, updated_at`,
      [name.trim(), req.params.id, req.user.sub]
    );
    if (q.rowCount === 0) return res.status(404).json({ message: "Project not found" });
    res.json(q.rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ message: "Nombre ya existe" });
    console.error("projects rename error:", err);
    res.status(500).json({ message: "Error interno" });
  }
});

app.delete("/projects/:id", auth, async (req, res) => {
  if (!pool) return res.status(500).json({ message: "Database not configured" });
  try {
    const q = await pool.query(
      `DELETE FROM projects WHERE id=$1 AND owner_id=$2 RETURNING id`,
      [req.params.id, req.user.sub]
    );
    if (q.rowCount === 0) return res.status(404).json({ message: "Proyecto no encontrado" });
    res.json({ ok: true, id });
  } catch (err) {
    console.error("projects delete error:", err);
    res.status(500).json({ message: "Error interno" });
  }
});

app.post("/projects/:id/slides", auth, async (req, res) => {
  if (!pool) return res.status(500).json({ message: "Database not configured" });
  try {
    const p = await getProjectForOwner(req.params.id, req.user.sub);
    if (!p) return res.status(404).json({ message: "Project not found" });

    const { html = "" } = req.body ?? {};
    const r = await pool.query(
      `SELECT COALESCE(MAX(position), 0) AS maxpos FROM slides WHERE project_id=$1`,
      [p.id]
    );
    const nextPos = Number(r.rows[0].maxpos) + 1;

    const ins = await pool.query(
      `INSERT INTO slides (project_id, position, html)
       VALUES ($1,$2,$3)
       RETURNING id, project_id, position, html, created_at, updated_at`,
      [p.id, nextPos, String(html)]
    );

    await pool.query(`UPDATE projects SET updated_at=NOW() WHERE id=$1`, [p.id]);

    res.status(201).json(ins.rows[0]);
  } catch (err) {
    console.error("slides create error:", err);
    res.status(500).json({ message: "Internal error" });
  }
});

app.patch("/projects/:id/slides/:slideId", auth, async (req, res) => {
  if (!pool) return res.status(500).json({ message: "Database not configured" });
  try {
    const p = await getProjectForOwner(req.params.id, req.user.sub);
    if (!p) return res.status(404).json({ message: "Project not found" });

    const { html } = req.body ?? {};
    if (typeof html !== "string")
      return res.status(400).json({ message: "Missing or invalid html" });

    const q = await pool.query(
      `UPDATE slides
       SET html=$1, updated_at=NOW()
       WHERE id=$2 AND project_id=$3
       RETURNING id, project_id, position, html, created_at, updated_at`,
      [html, req.params.slideId, p.id]
    );
    if (q.rowCount === 0) return res.status(404).json({ message: "Slide not found" });

    await pool.query(`UPDATE projects SET updated_at=NOW() WHERE id=$1`, [p.id]);

    res.json(q.rows[0]);
  } catch (err) {
    console.error("slides update error:", err);
    res.status(500).json({ message: "Internal error" });
  }
});

app.patch("/projects/:id/slides/:slideId/move", auth, async (req, res) => {
  if (!pool) return res.status(500).json({ message: "Database not configured" });
  try {
    const p = await getProjectForOwner(req.params.id, req.user.sub);
    if (!p) return res.status(404).json({ message: "Project not found" });

    const to = Number(req.body?.toPosition);
    if (!Number.isInteger(to) || to < 1)
      return res.status(400).json({ message: "Invalid toPosition" });

    const current = await pool.query(
      `SELECT id, position FROM slides WHERE id=$1 AND project_id=$2`,
      [req.params.slideId, p.id]
    );
    if (current.rowCount === 0) return res.status(404).json({ message: "Slide not found" });

    const fromPos = Number(current.rows[0].position);
    if (fromPos === to) return res.json({ ok: true, unchanged: true });

    await withTransaction(async (client) => {
      const maxQ = await client.query(
        `SELECT COUNT(*)::int AS cnt FROM slides WHERE project_id=$1`,
        [p.id]
      );
      const maxPos = maxQ.rows[0].cnt;
      const toPos = Math.min(Math.max(to, 1), maxPos);

      if (fromPos < toPos) {
        await client.query(
          `UPDATE slides
           SET position = position - 1
           WHERE project_id=$1 AND position > $2 AND position <= $3`,
          [p.id, fromPos, toPos]
        );
      } else {
        await client.query(
          `UPDATE slides
           SET position = position + 1
           WHERE project_id=$1 AND position >= $2 AND position < $3`,
          [p.id, toPos, fromPos]
        );
      }

      await client.query(
        `UPDATE slides SET position=$1, updated_at=NOW()
         WHERE id=$2 AND project_id=$3`,
        [toPos, req.params.slideId, p.id]
      );

      await client.query(`UPDATE projects SET updated_at=NOW() WHERE id=$1`, [p.id]);
    });

    const after = await pool.query(
      `SELECT id, project_id, position, html, created_at, updated_at
       FROM slides WHERE id=$1`,
      [req.params.slideId]
    );
    res.json(after.rows[0]);
  } catch (err) {
    console.error("slides move error:", err);
    res.status(500).json({ message: "Internal error" });
  }
});

app.patch("/projects/:id/slides/reorder", auth, async (req, res) => {
  if (!pool) return res.status(500).json({ message: "Database not configured" });
  try {
    const p = await getProjectForOwner(req.params.id, req.user.sub);
    if (!p) return res.status(404).json({ message: "Project not found" });

    const order = Array.isArray(req.body?.order) ? req.body.order : null;
    if (!order || order.some((x) => typeof x !== "string"))
      return res.status(400).json({ message: "Invalid order (array of slide IDs required)" });

    await withTransaction(async (client) => {
      for (let i = 0; i < order.length; i++) {
        await client.query(
          `UPDATE slides SET position=$1, updated_at=NOW()
           WHERE id=$2 AND project_id=$3`,
          [i + 1, order[i], p.id]
        );
      }
      await client.query(`UPDATE projects SET updated_at=NOW() WHERE id=$1`, [p.id]);
    });

    const r = await pool.query(
      `SELECT id, project_id, position, html, created_at, updated_at
       FROM slides
       WHERE project_id=$1
       ORDER BY position ASC`,
      [p.id]
    );
    res.json(r.rows);
  } catch (err) {
    console.error("slides reorder error:", err);
    res.status(500).json({ message: "Internal error" });
  }
});

app.delete("/projects/:id/slides/:slideId", auth, async (req, res) => {
  if (!pool) return res.status(500).json({ message: "Database not configured" });
  try {
    const p = await getProjectForOwner(req.params.id, req.user.sub);
    if (!p) return res.status(404).json({ message: "Project not found" });

    await withTransaction(async (client) => {
      const cur = await client.query(
        `SELECT id, position FROM slides WHERE id=$1 AND project_id=$2`,
        [req.params.slideId, p.id]
      );
      if (cur.rowCount === 0) throw Object.assign(new Error("Slide not found"), { status: 404 });

      const pos = Number(cur.rows[0].position);

      await client.query(
        `DELETE FROM slides WHERE id=$1 AND project_id=$2`,
        [req.params.slideId, p.id]
      );

      await client.query(
        `UPDATE slides
         SET position = position - 1
         WHERE project_id=$1 AND position > $2`,
        [p.id, pos]
      );

      await client.query(`UPDATE projects SET updated_at=NOW() WHERE id=$1`, [p.id]);
    });

    res.json({ ok: true, id: req.params.slideId });
  } catch (err) {
    if (err?.status === 404) return res.status(404).json({ message: "Slide not found" });
    console.error("slides delete error:", err);
    res.status(500).json({ message: "Internal error" });
  }
});

/* ---------- Gemini proxy ---------- */

app.post("/gemini", async (req, res) => {
  try {
    const { message, image, model } = req.body ?? {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "Falta mensaje" });
    }

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      console.error("GEMINI_API_KEY ausente");
      return res.status(500).json({ error: "Config del servidor incompleta (GEMINI_API_KEY)" });
    }

    const mdl = model || "gemini-1.5-flash-latest";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${mdl}:generateContent?key=${API_KEY}`;

    const parts = [{ text: String(message) }];
    if (image?.data && image?.mimeType) {
      parts.push({
        inline_data: { mime_type: image.mimeType, data: image.data }
      });
    }

    const payload = { contents: [{ role: "user", parts }] };

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const raw = await r.text();
    if (!r.ok) {
      let details;
      try { details = JSON.parse(raw); } catch { details = raw; }
      // devolvemos info útil al front para debug
      return res.status(502).json({ error: "Gemini upstream error", status: r.status, details });
    }

    res.type("application/json").send(raw);
  } catch (e) {
    console.error("Gemini proxy exception:", e);
    res.status(500).json({ error: "Error al conectar con Gemini" });
  }
});


const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`[BOOT] Server escuchando en http://localhost:${PORT}`);
});
