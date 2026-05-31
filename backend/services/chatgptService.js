import fetch from "node-fetch"

export async function generateWithChatGPT({ system, message, history, context, model, mode }) {
	if (!message || !String(message).trim()) throw new Error("Missing message")
	const API_KEY = process.env.OPENAI_API_KEY
	if (!API_KEY) throw new Error("OPENAI_API_KEY not configured")

	const mdl = model || "gpt-4o"
	const url = "https://api.openai.com/v1/responses"

	// Build input: previous conversation + current message
	const input = []

	if (Array.isArray(history) && history.length > 0) {
		for (const msg of history) {
			if (!msg || !msg.role || !msg.content) continue
			input.push({
				role: msg.role === "assistant" ? "assistant" : "user",
				content: String(msg.content)
			})
		}
	}

	let userMessage = String(message)
	if (context || mode) {
		const parts = []
		if (context) parts.push(`Context:\n${String(context).slice(-12000)}`)
		if (mode) parts.push(`[MODE]: ${String(mode)}`)
		parts.push(`User message:\n${message}`)
		userMessage = parts.join('\n\n')
	}

	input.push({ role: "user", content: userMessage })

	const payload = {
		model: mdl,
		instructions: system ? String(system) : undefined,
		input,
		temperature: 0.7,
		max_output_tokens: 4000,
		tools: [{ type: "web_search_preview" }],
	}

	const r = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Authorization": `Bearer ${API_KEY}`
		},
		body: JSON.stringify(payload)
	})

	const raw = await r.text()

	// Normalize Responses API output to { text } shape
	if (r.ok) {
		try {
			const data = JSON.parse(raw)
			// output is an array of items; find the first message with text
			const text = data.output
				?.filter(o => o.type === "message")
				?.flatMap(o => o.content)
				?.filter(c => c.type === "output_text")
				?.map(c => c.text)
				?.join("") || ""
			return { ok: true, status: r.status, raw: JSON.stringify({ text }) }
		} catch {
			return { ok: false, status: 500, raw }
		}
	}

	return { ok: false, status: r.status, raw }
}
