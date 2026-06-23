import { generateImage } from "../services/nvidiaImageService.js"

// Genera una imagen con FLUX y la devuelve como data URL base64 lista para usar
// en un <img src="...">. No la persiste en storage: la slide guarda el data URL
// inline (como ya hace con avatares base64).
export const generateImageController = async (req, res) => {
	try {
		const { prompt, width, height } = req.body ?? {}
		if (!prompt || !String(prompt).trim()) return res.status(400).json({ error: "Missing prompt" })

		const r = await generateImage({ prompt, width, height })
		if (!r.ok) {
			return res.status(r.status || 502).json({ error: "Image generation failed", details: r.error })
		}
		return res.json({ ok: true, url: `data:image/png;base64,${r.base64}` })
	} catch (err) {
		console.error("[Image] Error:", err)
		res.status(500).json({ error: "Image error", details: err instanceof Error ? err.message : String(err) })
	}
}
