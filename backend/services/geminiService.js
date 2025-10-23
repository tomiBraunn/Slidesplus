import fetch from "node-fetch"

export async function generateWithGemini({ system, mode, message, history, context, model, image }) {
	if (!message || !String(message).trim()) throw new Error("Missing message")
	const API_KEY = process.env.GEMINI_API_KEY
	if (!API_KEY) throw new Error("GEMINI_API_KEY not configured")

	const mdl = model || "gemini-2.5-flash"
	const url = `https://generativelanguage.googleapis.com/v1beta/models/${mdl}:generateContent?key=${API_KEY}`

	const contents = []

	if (Array.isArray(history) && history.length > 0) {
		for (const msg of history) {
			if (!msg || !msg.role || !msg.content) continue
			contents.push({
				role: msg.role === "assistant" ? "model" : "user",
				parts: [{ text: String(msg.content) }]
			})
		}
	}

	const parts = []

	if (system) parts.push({ text: `[SYSTEM INSTRUCTIONS]:\n${String(system)}\n\n` })
	if (context) parts.push({ text: `[CONTEXT]:\n${String(context).slice(-12000)}\n\n` })
	if (mode) parts.push({ text: `[MODE]: ${String(mode)}\n\n` })

	parts.push({ text: String(message) })

	if (image?.data && image?.mimeType) {
		parts.push({
			inline_data: {
				mime_type: image.mimeType,
				data: image.data
			}
		})
	}

	contents.push({ role: "user", parts })

	const payload = {
		contents,
		generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 8192 },
		safetySettings: [
			{ category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
			{ category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
			{ category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
			{ category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
		]
	}

	const r = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload)
	})
	const raw = await r.text()
	return { ok: r.ok, status: r.status, raw }
}
