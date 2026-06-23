import fetch from "node-fetch"

// Generación de imágenes con NVIDIA NIM (FLUX.1-schnell). Misma key que el resto
// de NVIDIA (NVIDIA_API_KEY), pero OTRA base URL: los modelos de imagen viven en
// ai.api.nvidia.com/v1/genai, no en integrate.api.nvidia.com.
//
// Respuesta verificada: { artifacts: [{ base64: "<png>" }] }.
const FLUX_URL = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell"

export async function generateImage({ prompt, width = 1344, height = 768 }) {
	if (!prompt || !String(prompt).trim()) throw new Error("Missing prompt")
	const API_KEY = process.env.NVIDIA_API_KEY
	if (!API_KEY) throw new Error("NVIDIA_API_KEY not configured")

	const payload = {
		prompt: String(prompt).slice(0, 1000),
		width,
		height,
		steps: 4, // schnell: pocos pasos, rápido
	}

	let r
	try {
		r = await fetch(FLUX_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${API_KEY}`,
			},
			body: JSON.stringify(payload),
		})
	} catch (err) {
		console.error("[FLUX] fetch error:", err?.message || err)
		return { ok: false, status: 502, error: String(err?.message || err) }
	}

	const text = await r.text()
	if (!r.ok) {
		console.error(`[FLUX] status=${r.status} body=${text.slice(0, 300)}`)
		return { ok: false, status: r.status, error: text.slice(0, 300) }
	}

	try {
		const data = JSON.parse(text)
		const b64 = data?.artifacts?.[0]?.base64
		if (!b64) return { ok: false, status: 500, error: "No image in response" }
		return { ok: true, status: 200, base64: b64 }
	} catch (e) {
		console.error("[FLUX] parse error:", e)
		return { ok: false, status: 500, error: "Parse error" }
	}
}
