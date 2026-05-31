import fetch from "node-fetch"

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite']
const rateLimitState = Object.fromEntries(GEMINI_MODELS.map(m => [m, { failedAt: null }]))
const COOLDOWN_MS = 60 * 1000

function isRateLimited(model) {
	const s = rateLimitState[model]
	return s?.failedAt && (Date.now() - s.failedAt) < COOLDOWN_MS
}
function markRateLimited(model) {
	if (rateLimitState[model]) rateLimitState[model].failedAt = Date.now()
}
function clearRateLimit(model) {
	if (rateLimitState[model]) rateLimitState[model].failedAt = null
}

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

export async function generateWithGeminiFallback(params) {
	for (const model of GEMINI_MODELS) {
		if (isRateLimited(model)) {
			console.log(`[Gemini] Skipping ${model} — rate limited`)
			continue
		}
		const r = await generateWithGemini({ ...params, model })
		if (r.ok) { clearRateLimit(model); return r }
		if (r.status === 429) { markRateLimited(model); continue }
		return r
	}
	return { ok: false, status: 429, raw: JSON.stringify({ error: 'All Gemini models rate limited' }) }
}

export async function buildCompressedHistory(history) {
	if (!Array.isArray(history) || history.length <= 20) return history
	const recent = history.slice(-10)
	const toSummarize = history.slice(0, -10)
	const summaryText = toSummarize.map(m => `${m.role}: ${m.content}`).join('\n')
	const r = await generateWithGemini({
		message: `Summarize this conversation in 3-5 sentences, preserving key decisions, slide changes, and important context:\n${summaryText}`,
		model: 'gemini-2.0-flash-lite'
	})
	if (!r.ok) return recent
	try {
		const data = JSON.parse(r.raw)
		const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
		return [
			{ role: 'user', content: `[Previous conversation summary]: ${summary}` },
			{ role: 'model', content: 'Understood. I have the context of our previous conversation.' },
			...recent
		]
	} catch {
		return recent
	}
}
