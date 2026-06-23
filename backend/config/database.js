import pkg from "pg"
const { Pool } = pkg

export const pool = process.env.DATABASE_URL
	? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
	: null

// Prevent unhandled error crashes when Supabase drops idle connections
if (pool) {
	pool.on("error", (err) => {
		console.error("[DB] Idle client error (ignored):", err.message)
	})
}
