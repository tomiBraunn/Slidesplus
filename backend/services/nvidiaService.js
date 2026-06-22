import fetch from "node-fetch"

// NVIDIA NIM (build.nvidia.com) expone 100+ modelos detrás de UNA sola URL
// OpenAI-compatible y UNA sola API key. Por eso los 3 modelos (Llama, Qwen-Coder,
// DeepSeek) usan exactamente este mismo servicio: solo cambia el `model` string.
//
// El controller espera la misma forma que chatgptService: { ok, status, raw },
// donde `raw` es un JSON string { text } cuando ok=true.
const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

// Modelos habilitados. El frontend manda el id con prefijo "nvidia/" para que el
// router lo distinga; acá lo mapeamos al id real de NIM.
// IDs verificados contra GET /v1/models de la cuenta (el catálogo cambia seguido;
// no adivinar — confirmar con /v1/models antes de tocar esto).
export const NVIDIA_MODELS = {
	"nvidia/llama-4": "meta/llama-4-maverick-17b-128e-instruct",
	"nvidia/qwen": "qwen/qwen3.5-397b-a17b",
	"nvidia/deepseek": "deepseek-ai/deepseek-v4-pro",
}

export function isNvidiaModel(model) {
	return typeof model === "string" && model.startsWith("nvidia/")
}

export async function generateWithNvidia({ system, message, history, context, model, mode }) {
	if (!message || !String(message).trim()) throw new Error("Missing message")
	const API_KEY = process.env.NVIDIA_API_KEY
	if (!API_KEY) throw new Error("NVIDIA_API_KEY not configured")

	const nimModel = NVIDIA_MODELS[model] || NVIDIA_MODELS["nvidia/llama-4"]

	// Mensajes estilo OpenAI Chat Completions.
	const messages = []
	if (system) messages.push({ role: "system", content: String(system) })

	if (Array.isArray(history) && history.length > 0) {
		for (const msg of history) {
			if (!msg || !msg.role || !msg.content) continue
			messages.push({
				role: msg.role === "assistant" ? "assistant" : "user",
				content: String(msg.content),
			})
		}
	}

	let userMessage = String(message)
	if (context || mode) {
		const parts = []
		if (context) parts.push(`Context:\n${String(context).slice(-12000)}`)
		if (mode) parts.push(`[MODE]: ${String(mode)}`)
		parts.push(`User message:\n${message}`)
		userMessage = parts.join("\n\n")
	}
	messages.push({ role: "user", content: userMessage })

	const payload = {
		model: nimModel,
		messages,
		temperature: 0.7,
		top_p: 0.95,
		max_tokens: 32000,
	}

	let r
	try {
		r = await fetch(NVIDIA_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${API_KEY}`,
			},
			body: JSON.stringify(payload),
		})
	} catch (err) {
		// Falla de red / timeout (los modelos top del free tier pueden colgarse).
		console.error("[NVIDIA] fetch error:", err?.message || err)
		return { ok: false, status: 502, raw: JSON.stringify({ error: String(err?.message || err) }) }
	}

	const raw = await r.text()
	console.log(`[NVIDIA] model=${nimModel} status=${r.status} body=${raw.slice(0, 800)}`)

	if (!r.ok) return { ok: false, status: r.status, raw }

	try {
		const data = JSON.parse(raw)
		let text = data?.choices?.[0]?.message?.content || ""
		// Algunos modelos envuelven en ```html ... ``` — destripar igual que ChatGPT.
		text = text.replace(/^```[\w]*\n?/m, "").replace(/\n?```$/m, "").trim()
		return { ok: true, status: r.status, raw: JSON.stringify({ text }) }
	} catch (e) {
		console.error("[NVIDIA] parse error:", e)
		return { ok: false, status: 500, raw }
	}
}
