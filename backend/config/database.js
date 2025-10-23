import pkg from "pg"
const { Pool } = pkg

export const pool = process.env.DATABASE_URL
	? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
	: null
