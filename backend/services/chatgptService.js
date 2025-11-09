import fetch from "node-fetch"

export async function generateWithChatGPT({ system, message, history, context, model }) {
	if (!message || !String(message).trim()) throw new Error("Missing message")
	const API_KEY = process.env.OPENAI_API_KEY
	if (!API_KEY) throw new Error("OPENAI_API_KEY not configured")

	const mdl = model || "gpt-4-turbo-preview"
	const url = "https://api.openai.com/v1/chat/completions"

	const messages = []

	// Add system prompt if provided
	if (system) {
		messages.push({
			role: "system",
			content: String(system)
		})
	}

	// Add conversation history
	if (Array.isArray(history) && history.length > 0) {
		for (const msg of history) {
			if (!msg || !msg.role || !msg.content) continue
			messages.push({
				role: msg.role === "assistant" ? "assistant" : "user",
				content: String(msg.content)
			})
		}
	}

	// Add current message with context if provided
	let userMessage = String(message)
	if (context) {
		userMessage = `Context:\n${String(context).slice(-12000)}\n\nUser message:\n${message}`
	}

	messages.push({
		role: "user",
		content: userMessage
	})

	const payload = {
		model: mdl,
		messages,
		temperature: 0.7,
		max_tokens: 4000
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
	return { ok: r.ok, status: r.status, raw }
}
