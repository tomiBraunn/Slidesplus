import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import pkg from 'pg';

const { Pool } = pkg;

// ===============================
// Config DB
// ===============================
if (!process.env.DATABASE_URL) {
  console.error("❌ No hay DATABASE_URL configurada en .env");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { require: true, rejectUnauthorized: false }
});

const app = express();
app.use(cors());
app.use(express.json());

// ===============================
// Rutas
// ===============================

// Salud
app.get("/", (req, res) => {
  res.json({ msg: "API funcionando 🚀" });
});

// Test DB
app.get("/dbtest", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ ok: true, time: result.rows[0] });
  } catch (err) {
    console.error("❌ Error en DB:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Crear usuario
app.post("/createuser", async (req, res) => {
  try {
    const { userid, nombre, password } = req.body ?? {};
    if (!userid || !nombre || !password) {
      return res.status(400).json({ message: "Faltan campos" });
    }

    await pool.query(
      "INSERT INTO usuario (userid, nombre, password) VALUES ($1, $2, $3)",
      [userid, nombre, password]
    );

    res.status(201).json({ ok: true, message: "Usuario creado" });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "El userid ya existe" });
    }
    console.error("❌ Error:", err.message);
    res.status(500).json({ message: "Error interno" });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { userid, password } = req.body ?? {};
    if (!userid || !password) {
      return res.status(400).json({ message: "Faltan campos" });
    }

    const r = await pool.query(
      "SELECT userid, nombre, password FROM usuario WHERE userid=$1",
      [userid]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const u = r.rows[0];
    if (u.password !== password) {
      return res.status(401).json({ message: "Clave inválida" });
    }

    const token = jwt.sign(
      { sub: u.userid, nombre: u.nombre },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ ok: true, user: { userid: u.userid, nombre: u.nombre }, token });
  } catch (err) {
    console.error("❌ Error:", err.message);
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

// Endpoint privado
app.get("/me", auth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// ===============================
// Start server
// ===============================
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 API lista en http://localhost:${PORT}`);
});
