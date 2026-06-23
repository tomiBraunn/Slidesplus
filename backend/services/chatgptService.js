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
		max_output_tokens: 32000,
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
	console.log(`[ChatGPT] status=${r.status} body=${raw.slice(0, 2000)}`)

	if (r.ok) {
		try {
			const data = JSON.parse(raw)

			console.log(`[ChatGPT] output types:`, data.output?.map(o => o.type))
			console.log(`[ChatGPT] output[last]:`, JSON.stringify(data.output?.[data.output.length - 1])?.slice(0, 500))

			// Responses API: output array with message items
			let text = data.output
				?.filter(o => o.type === "message")
				?.flatMap(o => o.content)
				?.filter(c => c.type === "output_text")
				?.map(c => c.text)
				?.join("") || ""

			// Fallback: output_text at top level
			if (!text && data.output_text) text = data.output_text

			// Fallback: direct text field
			if (!text && data.text) text = data.text

			// Strip markdown code blocks if GPT wraps output in ```html ... ```
			text = text.replace(/^```[\w]*\n?/m, '').replace(/\n?```$/m, '').trim()

			console.log(`[ChatGPT] parsed text length=${text.length}, preview: ${text.slice(0, 100)}`)
			return { ok: true, status: r.status, raw: JSON.stringify({ text }) }
		} catch (e) {
			console.error(`[ChatGPT] parse error:`, e)
			return { ok: false, status: 500, raw }
		}
	}

	return { ok: false, status: r.status, raw }
}
