import { generateWithGemini, generateWithGeminiFallback, buildCompressedHistory } from "../services/geminiService.js"
import { generateWithChatGPT } from "../services/chatgptService.js"
import { pool } from "../config/database.js"

async function isAdminUser(userId) {
	if (!pool || !userId) return false
	try {
		const r = await pool.query("SELECT is_admin FROM users WHERE id=$1", [userId])
		return r.rows[0]?.is_admin === true
	} catch (err) {
		console.error("[Gemini] isAdminUser error:", err)
		return false
	}
}

export const generateWithGeminiController = async (req, res) => {
	try {
		const userId = req.user?.sub ?? null
		const admin = await isAdminUser(userId)
		const { model: requestedModel, history: rawHistory, ...body } = req.body ?? {}

		const history = await buildCompressedHistory(rawHistory)

		if (admin) {
			const model = requestedModel || "gpt-4o"
			const isGeminiModel = model.startsWith("gemini-")
			console.log(`[AI Router] Admin ${userId} → ${model}`)

			if (isGeminiModel) {
				const r = await generateWithGemini({ ...body, history, model })
				if (!r.ok) {
					let details
					try { details = JSON.parse(r.raw) } catch { details = r.raw }
					return res.status(502).json({ error: "Gemini upstream error", status: r.status, details })
				}
				return res.type("application/json").send(r.raw)
			}

			const r = await generateWithChatGPT({ ...body, history, model })
			if (!r.ok) {
				let details
				try { details = JSON.parse(r.raw) } catch { details = r.raw }
				return res.status(502).json({ error: "GPT-4o upstream error", status: r.status, details })
			}
			const data = JSON.parse(r.raw)
			return res.json({ text: data.choices?.[0]?.message?.content || "" })
		}

		console.log(`[AI Router] User ${userId ?? 'anon'} → Gemini fallback`)
		const r = await generateWithGeminiFallback({ ...body, history })
		if (!r.ok) {
			let details
			try { details = JSON.parse(r.raw) } catch { details = r.raw }
			return res.status(502).json({ error: "Gemini upstream error", status: r.status, details })
		}
		res.type("application/json").send(r.raw)
	} catch (err) {
		console.error("[Gemini] Error:", err)
		res.status(500).json({ error: "Error connecting to AI", details: err instanceof Error ? err.message : String(err) })
	}
}

export const testGemini = async (_req, res) => {
	try {
		const r = await generateWithGemini({ message: "Say 'Hello' if you're working", model: "gemini-2.5-flash" })
		if (!r.ok) return res.status(502).json({ ok: false, status: r.status, error: r.raw })
		const data = JSON.parse(r.raw)
		res.json({ ok: true, response: data.candidates?.[0]?.content?.parts?.[0]?.text || "No text" })
	} catch (err) {
		res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) })
	}
}
