import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import pkg from 'pg';

const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { require: true, rejectUnauthorized: false },
});

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/", (req, res) => {
  res.json({ msg: "API funcionando" });
});

app.post("/createuser", async (req, res) => {
  try {
    const { username, email, password, first_name, last_name } = req.body ?? {};
    if (!username || !email || !password || !first_name || !last_name) return res.status(400).json({ message: "Faltan campos" });
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (username, email, password, first_name, last_name) VALUES ($1,$2,$3,$4,$5)`,
      [username, email, hashedPassword, first_name, last_name]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ message: "Usuario o email ya existe" });
    res.status(500).json({ message: "Error interno" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body ?? {};
    if (!identifier || !password) return res.status(400).json({ message: "Faltan campos" });
    const r = await pool.query(
      `SELECT id, username, email, password, first_name, last_name FROM users WHERE username=$1 OR email=$1`,
      [identifier]
    );
    if (r.rowCount === 0) return res.status(404).json({ message: "Usuario no encontrado" });
    const u = r.rows[0];
    const valid = await bcrypt.compare(password, u.password);
    if (!valid) return res.status(401).json({ message: "Clave inválida" });
    const token = jwt.sign({ sub: u.id, username: u.username, email: u.email }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ ok: true, user: { id: u.id, username: u.username, email: u.email, first_name: u.first_name, last_name: u.last_name }, token });
  } catch {
    res.status(500).json({ message: "Error interno" });
  }
});

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

app.get("/me", auth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

app.get("/projects", auth, async (req, res) => {
  try {
    const q = await pool.query(
      `SELECT id, owner_id, name, document, created_at, updated_at
       FROM projects
       WHERE owner_id = $1
       ORDER BY updated_at DESC, created_at DESC`,
      [req.user.sub]
    );
    res.json(q.rows);
  } catch {
    res.status(500).json({ message: "Error interno" });
  }
});

app.get("/projects/:id", auth, async (req, res) => {
  try {
    const q = await pool.query(
      `SELECT id, owner_id, name, document, created_at, updated_at
       FROM projects
       WHERE id = $1 AND owner_id = $2`,
      [req.params.id, req.user.sub]
    );
    if (q.rowCount === 0) return res.status(404).json({ message: "Proyecto no encontrado" });
    res.json(q.rows[0]);
  } catch {
    res.status(500).json({ message: "Error interno" });
  }
});

app.post("/projects", auth, async (req, res) => {
  try {
    const { name, document = "" } = req.body ?? {};
    if (!name || !name.trim()) return res.status(400).json({ message: "Falta nombre" });
    const q = await pool.query(
      `INSERT INTO projects (owner_id, name, document)
       VALUES ($1,$2,$3)
       RETURNING id, owner_id, name, document, created_at, updated_at`,
      [req.user.sub, name.trim(), document]
    );
    res.status(201).json(q.rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ message: "Nombre ya existe" });
    res.status(500).json({ message: "Error interno" });
  }
});

app.patch("/projects/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, document } = req.body ?? {};
    const fields = [];
    const vals = [];
    let i = 1;
    if (typeof name === "string" && name.trim()) { fields.push(`name=$${i++}`); vals.push(name.trim()); }
    if (typeof document === "string") { fields.push(`document=$${i++}`); vals.push(document); }
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
    res.status(500).json({ message: "Error interno" });
  }
});

app.patch("/projects/:id/rename", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body ?? {};
    if (!name || !name.trim()) return res.status(400).json({ message: "Falta nombre" });
    const q = await pool.query(
      `UPDATE projects
       SET name=$1, updated_at=NOW()
       WHERE id=$2 AND owner_id=$3
       RETURNING id, owner_id, name, document, created_at, updated_at`,
      [name.trim(), id, req.user.sub]
    );
    if (q.rowCount === 0) return res.status(404).json({ message: "Proyecto no encontrado" });
    res.json(q.rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ message: "Nombre ya existe" });
    res.status(500).json({ message: "Error interno" });
  }
});

app.delete("/projects/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const q = await pool.query(
      `DELETE FROM projects WHERE id=$1 AND owner_id=$2 RETURNING id`,
      [id, req.user.sub]
    );
    if (q.rowCount === 0) return res.status(404).json({ message: "Proyecto no encontrado" });
    res.json({ ok: true, id });
  } catch {
    res.status(500).json({ message: "Error interno" });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => { });
