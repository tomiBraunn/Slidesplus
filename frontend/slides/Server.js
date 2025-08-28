import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import pkg from 'pg';

const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  console.error("❌ No hay DATABASE_URL en .env");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { require: true, rejectUnauthorized: false },
});

const app = express();
app.use(cors());
app.use(express.json());

// ===============================
// RUTAS
// ===============================

// Salud
app.get("/", (req, res) => {
  res.json({ msg: "API funcionando" });
});

// Crear usuario
app.post("/createuser", async (req, res) => {
  try {
    const { username, email, password, first_name, last_name } = req.body ?? {};
    if (!username || !email || !password || !first_name || !last_name) {
      return res.status(400).json({ message: "Faltan campos" });
    }

    await pool.query(
      "INSERT INTO users (username, email, password, first_name, last_name) VALUES ($1, $2, $3, $4, $5)",
      [username, email, password, first_name, last_name]
    );

    res.status(201).json({ ok: true, message: "Usuario creado" });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Usuario o email ya existe" });
    }
    console.error("Error:", err.message);
    res.status(500).json({ message: "Error interno" });
  }
});

// Login (usuario o email)
app.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body ?? {};
    if (!identifier || !password) {
      return res.status(400).json({ message: "Faltan campos" });
    }

    const r = await pool.query(
      "SELECT id, username, email, password, first_name, last_name FROM users WHERE username=$1 OR email=$1",
      [identifier]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const u = r.rows[0];
    if (u.password !== password) {
      return res.status(401).json({ message: "Clave inválida" });
    }

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
    console.error("Error:", err.message);
    res.status(500).json({ message: "Error interno" });
  }
});

// Middleware para verificar token
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

// Ruta privada
app.get("/me", auth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// ===============================
// Start server
// ===============================
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`API lista en http://localhost:${PORT}`);
});
