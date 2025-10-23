import { createClient } from "@supabase/supabase-js"
import fetch from "node-fetch"
import https from "https"

const httpsAgent = new https.Agent({ rejectUnauthorized: false })

export const supabase = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_SERVICE_KEY,
	{
		auth: { persistSession: false, autoRefreshToken: false },
		global: {
			headers: { "User-Agent": "nodejs" },
			fetch: (url, options = {}) =>
				fetch(url, { ...options, agent: url.startsWith("https") ? httpsAgent : undefined })
		}
	}
)
