import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        // Obtener proyectos
        const { rows } = await pool.query('SELECT name, description FROM projects');
        res.status(200).json(rows);
    } else if (req.method === 'POST') {
        // Crear proyecto
        const { name, description } = req.body;
        await pool.query('INSERT INTO projects (name, description) VALUES ($1, $2)', [name, description]);
        res.status(201).json({ ok: true });
    } else if (req.method === 'PUT') {
        // Renombrar proyecto
        const { oldName, newName } = req.body;
        await pool.query('UPDATE projects SET name = $1 WHERE name = $2', [newName, oldName]);
        res.status(200).json({ ok: true });
    } else if (req.method === 'DELETE') {
        // Borrar proyecto
        const { name } = req.body;
        await pool.query('DELETE FROM projects WHERE name = $1', [name]);
        res.status(200).json({ ok: true });
    } else {
        res.status(405).end();
    }
}
