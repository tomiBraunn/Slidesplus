import { generateWithGemini, generateWithGeminiFallback, buildCompressedHistory } from "../services/geminiService.js"
import { generateWithChatGPT } from "../services/chatgptService.js"
import { pool } from "../config/database.js"
import { buildTemplateCatalogPrompt, getTemplateFiles } from "../services/templateService.js"

const TEMPLATE_KEYWORDS = [
	{ name: "html-ppt-zhangzara-signal",           keys: ["finance", "financiero", "consulting", "executive", "authority", "formal", "inversion", "inversión", "bank", "banco"] },
	{ name: "ib-pitch-book",                        keys: ["m&a", "investment banking", "pitch book", "valuation", "merger", "acquisition"] },
	{ name: "html-ppt-zhangzara-broadside",         keys: ["tech", "startup", "producto", "product", "dark", "developer", "engineering", "software"] },
	{ name: "html-ppt-zhangzara-studio",            keys: ["agencia", "agency", "branding", "creative agency", "bold", "diseño", "design studio"] },
	{ name: "html-ppt-zhangzara-bold-poster",       keys: ["manifesto", "brand", "marca", "founder", "vision", "poster", "creative"] },
	{ name: "html-ppt-taste-editorial",             keys: ["editorial", "investor memo", "report", "reporte", "annual", "anual", "minimalist", "minimal"] },
	{ name: "html-ppt-zhangzara-grove",             keys: ["nature", "naturaleza", "sustainability", "sustentabilidad", "eco", "green", "wellness", "ambiente"] },
	{ name: "html-ppt-zhangzara-vellum",            keys: ["art", "arte", "gallery", "galeria", "luxury", "lujo", "fashion", "moda"] },
	{ name: "html-ppt-zhangzara-soft-editorial",    keys: ["culture", "cultura", "lifestyle", "lifestyle", "soft", "elegant"] },
	{ name: "html-ppt-zhangzara-cobalt-grid",       keys: ["data", "datos", "research", "investigacion", "academic", "analytics", "graph", "graficos"] },
	{ name: "html-ppt-zhangzara-daisy-days",        keys: ["kids", "niños", "school", "escuela", "cute", "playful", "fun", "divertido"] },
	{ name: "html-ppt-zhangzara-retro-windows",     keys: ["retro", "windows", "90s", "vintage", "nostalgic"] },
	{ name: "html-ppt-zhangzara-8-bit-orbit",       keys: ["gaming", "game", "pixel", "8-bit", "videogame", "videojuego"] },
	{ name: "html-ppt-zhangzara-raw-grid",          keys: ["brutalist", "portfolio", "experimental", "neobrutalist"] },
	{ name: "html-ppt-zhangzara-neo-grid-bold",     keys: ["bold grid", "neon", "modern", "contemporaneo"] },
	{ name: "html-ppt-zhangzara-sakura-chroma",     keys: ["colorful", "colorido", "rainbow", "arcoiris", "vibrant", "vibrante"] },
	{ name: "html-ppt-hermes-cyber-terminal",       keys: ["cyber", "terminal", "hacker", "matrix", "code", "codigo"] },
	{ name: "html-ppt-zhangzara-monochrome",        keys: ["monochrome", "monocromatico", "black white", "blanco negro", "minimal typographic"] },
	{ name: "kami-deck",                            keys: ["saas", "app", "clean", "limpio", "product launch", "lanzamiento"] },
	{ name: "html-ppt-pitch-deck",                  keys: ["pitch", "deck", "investors", "inversores", "fundraising", "ronda"] },
	{ name: "html-ppt-product-launch",              keys: ["launch", "lanzamiento de producto", "release", "new product"] },
	{ name: "html-ppt-course-module",               keys: ["course", "curso", "workshop", "training", "clase", "educacion", "education", "lesson"] },
	{ name: "html-ppt-tech-sharing",                keys: ["tech talk", "charla", "sharing", "conference", "conferencia", "meetup"] },
	{ name: "open-design-landing-deck",             keys: ["company", "empresa", "corporate", "corporativo", "general", "overview"] },
]

function pickTemplateLocal(message) {
	const lower = message.toLowerCase()

	// Explicit template name in message always wins
	const allTemplateNames = TEMPLATE_KEYWORDS.map(t => t.name)
	for (const name of allTemplateNames) {
		if (lower.includes(name)) {
			console.log(`[Template] Explicit match: ${name}`)
			return name
		}
	}
	// Also match short slugs like "vellum", "broadside", "studio", etc.
	for (const name of allTemplateNames) {
		const slug = name.replace(/^html-ppt-zhangzara-|^html-ppt-|^kami-|^open-design-/, "")
		if (slug.length > 3 && lower.includes(slug)) {
			console.log(`[Template] Slug match "${slug}": ${name}`)
			return name
		}
	}

	for (const { name, keys } of TEMPLATE_KEYWORDS) {
		if (keys.some(k => lower.includes(k))) {
			console.log(`[Template] Keyword match: ${name}`)
			return name
		}
	}
	// Topic fallbacks
	if (/apple|google|microsoft|amazon|tesla|tech company/.test(lower)) return "html-ppt-zhangzara-broadside"
	if (/marketing|ventas|sales/.test(lower)) return "html-ppt-zhangzara-studio"
	if (/historia|history|cultura|culture/.test(lower)) return "html-ppt-zhangzara-soft-editorial"
	if (/ciencia|science|medicina|medicine|health|salud/.test(lower)) return "html-ppt-zhangzara-cobalt-grid"
	console.log(`[Template] No match, using default`)
	return "open-design-landing-deck"
}

async function isAdminUser(userId) {
	if (!pool || !userId) return false
	try {
		const r = await pool.query("SELECT is_admin FROM users WHERE id=$1", [userId])
		return r.rows[0]?.is_admin === true
	} catch (err) {
		console.error("[Gemini] isAdminUser error:", err)
		return false
	}
}

async function injectTemplateContext(body) {
	if (body.mode !== "slides") return body

	const templateName = pickTemplateLocal(body.message || "")
	if (!templateName) return body

	const files = getTemplateFiles(templateName)
	if (!files) return body

	// Extract just font imports + CSS variables from example (first 80 lines)
	const cssSnippet = files.example.split("\n").slice(0, 80).join("\n")

	const templateContext = `=== DESIGN TEMPLATE: ${templateName} ===
${files.skill.split("\n").slice(0, 40).join("\n")}

CSS VARIABLES & FONTS (use these exactly):
${cssSnippet}
=== END TEMPLATE ===

FONT RULE: No <link> tags allowed. Put fonts in a <style> tag inside the FIRST <section>:
<section style="width:1920px;height:1080px;overflow:hidden;position:relative;">
  <style>@import url('https://fonts.googleapis.com/css2?family=...');</style>
  ...content...
</section>

Apply the template's colors, fonts, and visual DNA to all slides. Output raw <section> tags only.`

	return {
		...body,
		system: (body.system ? body.system + "\n\n" : "") + templateContext
	}
}

export const generateWithGeminiController = async (req, res) => {
	try {
		const userId = req.user?.sub ?? null
		const admin = await isAdminUser(userId)
		const { model: requestedModel, history: rawHistory, ...rawBody } = req.body ?? {}

		const history = await buildCompressedHistory(rawHistory)
		const body = await injectTemplateContext({ ...rawBody, history })

		if (admin) {
			const model = requestedModel || "gpt-4o"
			const isGeminiModel = model.startsWith("gemini-")
			console.log(`[AI Router] Admin ${userId} → ${model}`)

			if (isGeminiModel) {
				const r = await generateWithGemini({ ...body, model })
				if (!r.ok) {
					let details
					try { details = JSON.parse(r.raw) } catch { details = r.raw }
					console.error("[Gemini] upstream error:", r.status, typeof details === "object" ? JSON.stringify(details).slice(0, 300) : String(details).slice(0, 300))
					return res.status(502).json({ error: "Gemini upstream error", status: r.status, details })
				}
				return res.type("application/json").send(r.raw)
			}

			const r = await generateWithChatGPT({ ...body, model })
			if (!r.ok) {
				let details
				try { details = JSON.parse(r.raw) } catch { details = r.raw }
				console.error("[GPT] upstream error:", r.status, typeof details === "object" ? JSON.stringify(details).slice(0, 300) : String(details).slice(0, 300))
				return res.status(502).json({ error: "GPT-4o upstream error", status: r.status, details })
			}
			const data = JSON.parse(r.raw)
			return res.json({ text: data.text || "" })
		}

		console.log(`[AI Router] User ${userId ?? 'anon'} → Gemini fallback`)
		const r = await generateWithGeminiFallback({ ...body })
		if (!r.ok) {
			let details
			try { details = JSON.parse(r.raw) } catch { details = r.raw }
			console.error("[Gemini fallback] upstream error:", r.status, typeof details === "object" ? JSON.stringify(details).slice(0, 300) : String(details).slice(0, 300))
			return res.status(502).json({ error: "Gemini upstream error", status: r.status, details })
		}
		res.type("application/json").send(r.raw)
	} catch (err) {
		console.error("[Gemini] Error:", err)
		res.status(500).json({ error: "Error connecting to AI", details: err instanceof Error ? err.message : String(err) })
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
