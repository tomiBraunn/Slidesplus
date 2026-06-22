import { generateWithGemini, generateWithGeminiFallback, buildCompressedHistory } from "../services/geminiService.js"
import { generateWithChatGPT } from "../services/chatgptService.js"
import { generateWithNvidia, isNvidiaModel } from "../services/nvidiaService.js"
import { pool } from "../config/database.js"
import { getTemplateCatalog, getTemplateFiles, getSlidesPlusContent, getTemplateStyleContext, matchExplicitTemplate, matchTemplateByTrigger } from "../services/templateService.js"
import { buildTemplateStyleBlock, injectAuthoritativeStyles } from "./geminiController.js"

async function isAdminUser(userId) {
	if (!pool || !userId) return false
	try {
		const r = await pool.query("SELECT is_admin FROM users WHERE id=$1", [userId])
		return r.rows[0]?.is_admin === true
	} catch { return false }
}

function buildTemplateCatalogList() {
	const catalog = getTemplateCatalog()
	return catalog.map(t => `- ${t.name}: ${t.description}`).join("\n")
}

function getTemplateContext(name) {
	const files = getTemplateFiles(name)
	if (!files) return ""
	const skillSnippet = files.skill.split("\n").slice(0, 40).join("\n")
	// Prefer slides-plus format (already uses <section> + px sizing); fall back to example.html
	const styleRef = files.slidesPlus
		? files.slidesPlus
		: files.example.split("\n").slice(0, 80).join("\n")
	return `=== DESIGN TEMPLATE: ${name} ===
${skillSnippet}

STYLE REFERENCE (copy CSS variables, fonts, and layout patterns from this — already in Slides Plus format):
${styleRef}
=== END TEMPLATE ===`
}

function truncateSlide(html, maxChars = 2000) {
	if (html.length <= maxChars) return html
	return html.slice(0, maxChars) + "\n<!-- ...truncated -->"
}

const AGENT_SYSTEM_PROMPT = `You are a slide deck agent. You receive the current state of a presentation (all slides as HTML) and a user instruction. You must decide what to do and return a JSON response.

RENDERING CONTEXT:
- Slides render in an iframe at exactly 1920×1080px. Use px only — NO vw, vh, clamp(), or %
- Every <section>: style="width:1920px;height:1080px;overflow:hidden;position:relative;"
- FONT RULE: No <link> tags. Put @import inside a <style> tag in the FIRST <section> only

RESPONSE FORMAT — return ONLY valid JSON, no markdown, no explanation:

{
  "action": "replace_all" | "replace_slide" | "insert_after" | "delete_slide" | "delete_all" | "chat",
  "template": "template-name-or-null",
  "slideIndex": 0,
  "slides": ["<section>...</section>", ...],
  "message": "Short message to show the user"
}

ACTION RULES:
- "replace_all": user wants a new presentation, regenerate everything. "slides" = all new sections
- "replace_slide": user wants to edit one specific slide. "slideIndex" = which one (0-based), "slides" = [single section]
- "insert_after": user wants to add slides. "slideIndex" = insert after this index, "slides" = new sections to insert
- "delete_slide": delete one slide. "slideIndex" = which one. "slides" = []
- "delete_all": delete everything. "slides" = []
- "chat": not a slide action, just answer. "slides" = []

TEMPLATE SELECTION:
When generating slides, pick the best template from the catalog below. If user explicitly names one, use it. Faithfully reproduce the template's colors, fonts, layout patterns, and visual identity on every slide.

AVAILABLE TEMPLATES:
{{CATALOG}}

SLIDE GENERATION RULES:
- Default to 10 slides unless user specifies otherwise
- Each slide has ONE clear message, max 5 bullet points (max 8 words each)
- Vary layouts: never repeat the same structure twice in a row
- All text within safe zone: 100px–1820px × 80px–1000px
- BACKGROUND RULE: Use the template's own background colors (CSS variables like --c-bg, solid colors, gradients). Do NOT use photos or external images unless the content specifically calls for one (e.g. a product photo slide). The template's visual identity comes from its color palette and typography, not stock images.
- If a photo is genuinely needed (1–2 slides max per deck), use https://picsum.photos/seed/{WORD}/1920/1080 with a dark overlay, but this should be the exception not the rule.`

export const slidesAgentController = async (req, res) => {
	try {
		const userId = req.user?.sub ?? null
		const admin = await isAdminUser(userId)
		const { slides = [], message, model: requestedModel, history } = req.body ?? {}

		if (!message?.trim()) return res.status(400).json({ error: "Missing message" })

		// Build the prompt
		const catalog = buildTemplateCatalogList()
		const systemPrompt = AGENT_SYSTEM_PROMPT.replace("{{CATALOG}}", catalog)

		// Summarize current slides for context (truncated to avoid token explosion)
		let slidesContext = ""
		if (slides.length > 0) {
			const summaries = slides.map((html, i) => `=== SLIDE ${i + 1} ===\n${truncateSlide(html)}`)
			slidesContext = `CURRENT PRESENTATION (${slides.length} slides):\n\n${summaries.join("\n\n")}\n\n`
		} else {
			slidesContext = "CURRENT PRESENTATION: empty (no slides yet)\n\n"
		}

		const fullMessage = `${slidesContext}USER INSTRUCTION: ${message}`

		// Conversation memory: prior turns so the agent remembers what it just did
		// (e.g. "you removed the iframe", "make it bigger"). Compressed to cap tokens.
		const convoHistory = await buildCompressedHistory(Array.isArray(history) ? history : [])

		// Call AI
		let rawText = ""
		if (admin) {
			const model = requestedModel || "gpt-4o"
			const isGemini = model.startsWith("gemini-")
			console.log(`[SlidesAgent] Admin ${userId} → ${model}`)

			if (isGemini) {
				const r = await generateWithGemini({ system: systemPrompt, message: fullMessage, history: convoHistory, model })
				if (!r.ok) {
					let details; try { details = JSON.parse(r.raw) } catch { details = r.raw }
					console.error("[SlidesAgent] Gemini error:", r.status)
					return res.status(502).json({ error: "Gemini upstream error", status: r.status, details })
				}
				const data = JSON.parse(r.raw)
				rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
			} else if (isNvidiaModel(model)) {
				const r = await generateWithNvidia({ system: systemPrompt, message: fullMessage, history: convoHistory, model })
				if (!r.ok) {
					let details; try { details = JSON.parse(r.raw) } catch { details = r.raw }
					console.error("[SlidesAgent] NVIDIA error:", r.status)
					return res.status(502).json({ error: "NVIDIA upstream error", status: r.status, details })
				}
				const data = JSON.parse(r.raw)
				rawText = data.text || ""
			} else {
				const r = await generateWithChatGPT({ system: systemPrompt, message: fullMessage, history: convoHistory, model })
				if (!r.ok) {
					let details; try { details = JSON.parse(r.raw) } catch { details = r.raw }
					console.error("[SlidesAgent] GPT error:", r.status)
					return res.status(502).json({ error: "GPT upstream error", status: r.status, details })
				}
				const data = JSON.parse(r.raw)
				rawText = data.text || ""
			}
		} else {
			console.log(`[SlidesAgent] User ${userId ?? "anon"} → Gemini fallback`)
			const r = await generateWithGeminiFallback({ system: systemPrompt, message: fullMessage, history: convoHistory })
			if (!r.ok) {
				let details; try { details = JSON.parse(r.raw) } catch { details = r.raw }
				return res.status(502).json({ error: "Gemini upstream error", status: r.status, details })
			}
			const data = JSON.parse(r.raw)
			rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
		}

		// Parse JSON response — strip markdown fences if present
		const cleaned = rawText.replace(/^```[\w]*\n?/m, "").replace(/\n?```$/m, "").trim()
		let agentResponse
		try {
			agentResponse = JSON.parse(cleaned)
		} catch (e) {
			console.error("[SlidesAgent] Failed to parse JSON:", cleaned.slice(0, 500))
			return res.status(500).json({ error: "Agent returned invalid JSON", raw: cleaned.slice(0, 1000) })
		}

		// A template the user explicitly asked for always beats the agent's pick.
		// Triggers ("mat", "warm-modern"...) only count when paired with a style word,
		// so casual phrasing doesn't hijack the agent's choice.
		const generatesSlides = ["replace_all", "replace_slide", "insert_after"].includes(agentResponse.action)
		if (generatesSlides) {
			const userTemplate = matchExplicitTemplate(message)
				|| (/\b(estilo|style|template|plantilla|tema|theme)\b/i.test(message) ? matchTemplateByTrigger(message) : null)
			if (userTemplate && userTemplate !== agentResponse.template) {
				console.log(`[SlidesAgent] User-requested template overrides agent pick: ${userTemplate} (was ${agentResponse.template})`)
				agentResponse.template = userTemplate
			}
		}

		// Two-pass: if agent generated slides with a template, restyle them using the real template CSS
		const needsRestyle = agentResponse.template &&
			agentResponse.slides?.length > 0 &&
			["replace_all", "replace_slide", "insert_after"].includes(agentResponse.action)

		if (needsRestyle) {
			console.log(`[SlidesAgent] Template: ${agentResponse.template} — running restyle pass (batched)`)
			const styleCtx = getTemplateStyleContext(agentResponse.template)
			if (styleCtx) {
				const restyleSystem = `You are a slide HTML restyler. You receive:
1. A CSS design system (already converted to px, ready to embed)
2. Example slide HTML from the same template (shows which classes/structure to use)
3. Draft slides with content to restyle

Your job: rewrite each slide to faithfully reproduce the template's visual identity while keeping all text content exactly the same.

CRITICAL RULES:
- Keep all text content (titles, subtitles, bullets, body text) EXACTLY as-is word for word.
- Use the template's classes, colors, backgrounds, and layout patterns on every slide.
- Do NOT include any <style> tag — the full stylesheet is injected automatically by the system. Just use the template's classes and CSS variables on the HTML.
- Every section: style="width:1920px;height:1080px;overflow:hidden;position:relative;"
- All values in px only — no vw, vh, %, clamp(). The CSS provided is already converted.
- Vary layouts slide to slide — don't make every slide a title+bullets column.
- Return ONLY a valid JSON array of strings: ["<section>...</section>", "<section>...</section>", ...]
- No markdown fences, no explanation text, no wrapper object — ONLY the JSON array.`

				const exampleSlideStr = styleCtx.exampleSlides.length > 0
					? `\nEXAMPLE SLIDES FROM THIS TEMPLATE (use these as structural reference — note which classes are used and how elements are positioned):\n${styleCtx.exampleSlides.join("\n\n")}\n`
					: ""

				// Una sola función que enruta al modelo correcto y devuelve el texto crudo.
				const callRestyle = async (message) => {
					if (admin) {
						const model = requestedModel || "gpt-4o"
						if (model.startsWith("gemini-")) {
							const r = await generateWithGemini({ system: restyleSystem, message, model })
							return r.ok ? (JSON.parse(r.raw).candidates?.[0]?.content?.parts?.[0]?.text || "") : ""
						} else if (isNvidiaModel(model)) {
							const r = await generateWithNvidia({ system: restyleSystem, message, model })
							return r.ok ? (JSON.parse(r.raw).text || "") : ""
						}
						const r = await generateWithChatGPT({ system: restyleSystem, message, model })
						return r.ok ? (JSON.parse(r.raw).text || "") : ""
					}
					const r = await generateWithGeminiFallback({ system: restyleSystem, message })
					return r.ok ? (JSON.parse(r.raw).candidates?.[0]?.content?.parts?.[0]?.text || "") : ""
				}

				// Parseo tolerante: intenta JSON.parse; si viene truncado, recupera las
				// <section> completas con regex en vez de descartar el lote entero.
				const parseSectionsTolerant = (raw) => {
					if (!raw) return []
					const cleaned = raw.replace(/^```[\w]*\n?/m, "").replace(/\n?```$/m, "").trim()
					try {
						const arr = JSON.parse(cleaned)
						if (Array.isArray(arr)) return arr.filter(s => typeof s === "string" && s.includes("<section"))
					} catch { /* truncado o no-JSON: caer al regex */ }
					return cleaned.match(/<section[\s\S]*?<\/section>/gi) || []
				}

				const draft = agentResponse.slides
				const cssBlock = `TEMPLATE CSS (reference only — do NOT reproduce it, the system injects it):
\`\`\`css
${styleCtx.fonts}

${styleCtx.css}
\`\`\`
${exampleSlideStr}`

				// Reestilizar en lotes chicos (4 slides) para no truncar la respuesta.
				const BATCH = 4
				const out = []
				let anyFailed = false
				try {
					for (let i = 0; i < draft.length; i += BATCH) {
						const batch = draft.slice(i, i + BATCH)
						const msg = `${cssBlock}
DRAFT SLIDES TO RESTYLE (keep all content, apply template visual identity). Return a JSON array with exactly ${batch.length} restyled <section> strings:
${batch.map((s, j) => `--- Slide ${i + j + 1} ---\n${s}`).join("\n\n")}`
						let sections = []
						try { sections = parseSectionsTolerant(await callRestyle(msg)) } catch { sections = [] }
						// Si el lote no devolvió lo suficiente, completar con los originales
						// (mejor una slide sin restyle que perder su contenido).
						if (sections.length < batch.length) {
							anyFailed = true
							for (let k = sections.length; k < batch.length; k++) sections.push(batch[k])
						}
						out.push(...sections.slice(0, batch.length))
					}
				} catch (e) {
					console.error("[SlidesAgent] Restyle batching error:", e.message)
				}

				if (out.length > 0) {
					// Inyectar el stylesheet autoritativo una sola vez, de forma determinista.
					const styleBlock = buildTemplateStyleBlock(styleCtx)
					const joined = injectAuthoritativeStyles(out.join("\n"), styleBlock)
					agentResponse.slides = joined.match(/<section[\s\S]*?<\/section>/gi) || out
					console.log(`[SlidesAgent] Restyle done: ${agentResponse.slides.length} slides${anyFailed ? " (some batches fell back to draft)" : ""}`)
				}
			}
		}

		console.log(`[SlidesAgent] action=${agentResponse.action} slides=${agentResponse.slides?.length ?? 0} template=${agentResponse.template}`)
		return res.json(agentResponse)

	} catch (err) {
		console.error("[SlidesAgent] Error:", err)
		res.status(500).json({ error: "Slides agent error", details: err instanceof Error ? err.message : String(err) })
	}
}
