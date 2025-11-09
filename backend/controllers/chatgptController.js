import { generateWithChatGPT } from "../services/chatgptService.js"

export const generateWithChatGPTController = async (req, res) => {
	try {
		const r = await generateWithChatGPT(req.body ?? {})
		if (!r.ok) {
			let details
			try { details = JSON.parse(r.raw) } catch { details = r.raw }
			return res.status(502).json({ error: "ChatGPT upstream error", status: r.status, details })
		}

		// Parse OpenAI response and return in the same format as Gemini
		const data = JSON.parse(r.raw)
		const text = data.choices?.[0]?.message?.content || ""

		res.json({ text })
	} catch (err) {
		console.error("[ChatGPT] Error:", err)
		res.status(500).json({ error: "Error connecting to ChatGPT", details: err instanceof Error ? err.message : String(err) })
	}
}

export const testChatGPT = async (_req, res) => {
	try {
		const r = await generateWithChatGPT({ message: "Say 'Hello' if you're working", model: "gpt-4-turbo-preview" })
		if (!r.ok) return res.status(502).json({ ok: false, status: r.status, error: r.raw })
		const data = JSON.parse(r.raw)
		res.json({ ok: true, response: data.choices?.[0]?.message?.content || "No text" })
	} catch (err) {
		res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) })
	}
}
