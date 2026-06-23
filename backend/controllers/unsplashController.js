import fetch from "node-fetch"

export const searchUnsplash = async (req, res) => {
	try {
		const { query, page = 1, per_page = 20 } = req.query
		if (!query) return res.status(400).json({ error: "Missing search query" })
		const API_KEY = process.env.UNSPLASH_ACCESS_KEY
		if (!API_KEY) return res.status(500).json({ error: "Unsplash API key not configured" })

		const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${per_page}`
		const response = await fetch(url, { headers: { Authorization: `Client-ID ${API_KEY}` } })
		if (!response.ok) {
			const error = await response.json()
			return res.status(response.status).json({ error })
		}
		const data = await response.json()
		res.json(data)
	} catch (err) {
		console.error("Unsplash API error:", err)
		res.status(500).json({ error: "Error connecting to Unsplash", detail: err instanceof Error ? err.message : String(err) })
	}
}

export const testUnsplash = async (_req, res) => {
	try {
		const API_KEY = process.env.UNSPLASH_ACCESS_KEY
		if (!API_KEY) return res.status(500).json({ ok: false, error: "No API key configured" })
		const response = await fetch("https://api.unsplash.com/photos/random?count=1", { headers: { Authorization: `Client-ID ${API_KEY}` } })
		if (!response.ok) {
			const error = await response.json()
			return res.status(response.status).json({ ok: false, error })
		}
		const data = await response.json()
		res.json({ ok: true, photo: data[0], message: "Unsplash API is working!" })
	} catch (err) {
		res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) })
	}
}
