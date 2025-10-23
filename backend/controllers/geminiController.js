import { generateWithGemini } from "../services/geminiService.js"

export const generateWithGeminiController = async (req, res) => {
	try {
		const r = await generateWithGemini(req.body ?? {})
		if (!r.ok) {
			let details
			try { details = JSON.parse(r.raw) } catch { details = r.raw }
			return res.status(502).json({ error: "Gemini upstream error", status: r.status, details })
		}
		res.type("application/json").send(r.raw)
	} catch (err) {
		console.error("[Gemini] Error:", err)
		res.status(500).json({ error: "Error connecting to Gemini", details: err instanceof Error ? err.message : String(err) })
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
