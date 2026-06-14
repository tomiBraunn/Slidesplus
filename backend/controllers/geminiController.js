import { generateWithGemini, generateWithGeminiFallback, buildCompressedHistory } from "../services/geminiService.js"
import { generateWithChatGPT } from "../services/chatgptService.js"
import { pool } from "../config/database.js"
import { getTemplateFiles, getTemplateStyleContext, pickTemplateForMessage } from "../services/templateService.js"

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

const TEMPLATE_SLIDES_SYSTEM = `You are an art director recreating a presentation inside an exact design template. You receive:
1. The template's SKILL notes (design intent and rules)
2. The template's full CSS design system (fonts, variables, class definitions — already converted to px for a 1920×1080 canvas)
3. Example slides from the template (the visual target)
4. A topic from the user

Your job: produce a complete presentation that looks almost exactly like the example slides — same fonts, colors, decorative elements, and layout vocabulary — with new content about the user's topic.

CRITICAL RULES:
- Return ONLY <section> tags. NO doctype, html, head, or body tags. NO markdown fences. NO explanation text.
- Every <section>: style="width:1920px;height:1080px;overflow:hidden;position:relative;" plus the template's slide background (e.g. background:var(--c-bg)).
- Do NOT emit any <style> tag and do NOT reproduce the template CSS. The system injects the complete, authoritative stylesheet automatically. Your job is ONLY the HTML markup.
- Style all content with the template's CLASSES and CSS variables exactly as the example slides do (e.g. class="h2", class="bullet-list", class="slide--cover"). Never invent new colors, fonts, or spacing — stay inside the design system.
- EACH <section> must contain a LAYOUT WRAPPER div using one of the template's slide-layout classes (e.g. class="slide--cover", class="slide--statement", class="slide--stats", class="slide--quote", class="slide--list", class="slide--compare"). The layout class is what centers/positions the content — content placed directly in the section without it will NOT be positioned correctly. Copy the exact nesting from the example slides.
- Do NOT add inline layout styles (padding/flex/positioning) on the wrapper — the layout class already handles it. Inline styles are only for per-element tweaks the example slides themselves use.
- All values in px only — no vw, vh, %, or clamp(). The CSS provided is already converted.
- All content must stay within the 1920×1080 canvas.
- Vary layouts: use a DIFFERENT slide-layout class for variety across the deck; never repeat the same layout twice in a row.
- Number of slides: exactly what the user requests; default to 10 if unspecified.
- Do NOT use photos or external images unless the content specifically calls for one. The template's identity comes from its palette and typography.`

// Read a CSS custom property value out of the template's :root block, trying a
// list of likely names (templates use --c-bg / --bg / --paper, etc.).
function readRootVar(css, names) {
	const root = (css.match(/:root\s*\{[\s\S]*?\}/) || [""])[0]
	for (const name of names) {
		const m = root.match(new RegExp(`${name.replace(/[-]/g, "\\-")}\\s*:\\s*([^;]+)`))
		if (m) return m[1].trim()
	}
	return null
}

// Build the authoritative <style> block (fonts + full template CSS) that gets
// injected deterministically into the generated deck. We do NOT trust the model
// to copy 14KB of CSS faithfully — it tends to keep :root and drop class rules.
//
// We also append a base `section {}` rule applying the template's background,
// text color and body font DIRECTLY to every section. The template's own CSS
// puts those on `.slide.dark` / `html,body`, but the model emits bare <section>
// tags without those classes — so without this the deck renders white/black.
export function buildTemplateStyleBlock(styleCtx) {
	let css = styleCtx.css
		// CSS targets sections, not the iframe body
		.replace(/\bhtml\s*,\s*body\b/gi, "section")
		.replace(/(^|[^.\w-])body\b(?!\s*-)/gi, "$1section")

	const bg = readRootVar(styleCtx.css, ["--c-bg", "--bg", "--paper", "--c-bg-light", "--background"])
	const fg = readRootVar(styleCtx.css, ["--c-fg", "--fg", "--ink", "--c-fg-light", "--text", "--foreground"])
	const bodyFont = readRootVar(styleCtx.css, ["--f-body", "--f-section", "--f-sans", "--font-body"])

	const baseDecls = []
	if (bg) baseDecls.push(`background:${bg}`)
	if (fg) baseDecls.push(`color:${fg}`)
	if (bodyFont) baseDecls.push(`font-family:${bodyFont}`)
	const baseRule = baseDecls.length
		? `\nsection{${baseDecls.join(";")};}`
		: ""

	return `<style>\n${styleCtx.fonts}\n\n${css}${baseRule}\n</style>`
}

// Replace whatever <style> the model emitted in each section with the real,
// complete template style block. Sections without a <style> get one injected
// right after the opening tag. This guarantees class definitions are present.
export function injectAuthoritativeStyles(html, styleBlock) {
	if (!html) return html
	const sections = html.match(/<section[\s\S]*?<\/section>/gi)
	if (!sections) return html

	let injectedOnce = false
	const fixed = sections.map((sec) => {
		// Strip any model-emitted <style> blocks first
		let s = sec.replace(/<style[\s\S]*?<\/style>/gi, "")
		// The model often hardcodes background:var(--paper,#fff) inline on the
		// <section>. --paper rarely exists in a template, so it falls back to
		// white AND inline beats our section{} rule. Remove that inline bg so
		// the template's real background applies.
		s = s.replace(/(<section[^>]*style=")([^"]*)(")/i, (_, pre, style, post) => {
			const cleaned = style
				.replace(/background\s*:\s*var\(\s*--paper[^;"]*\)\s*;?/gi, "")
				.replace(/;;+/g, ";")
			return pre + cleaned + post
		})
		// Put the full template style block in the first section only;
		// every section in an isolated iframe gets it propagated client-side,
		// but including it once keeps the stored HTML compact and valid.
		if (!injectedOnce) {
			s = s.replace(/(<section[^>]*>)/i, `$1${styleBlock}`)
			injectedOnce = true
		}
		return s
	})
	return fixed.join("\n")
}

// Gemini returns its text nested in candidates[].content.parts[].text. Rewrite
// that text in place with the authoritative styles, preserving the JSON shape
// the frontend expects. No-op if styleBlock is null or parsing fails.
function applyStylesToGeminiRaw(raw, styleBlock) {
	if (!styleBlock) return raw
	try {
		const data = JSON.parse(raw)
		const parts = data?.candidates?.[0]?.content?.parts
		if (Array.isArray(parts)) {
			for (const p of parts) {
				if (typeof p.text === "string" && /<section/i.test(p.text)) {
					p.text = injectAuthoritativeStyles(p.text, styleBlock)
				}
			}
		}
		return JSON.stringify(data)
	} catch {
		return raw
	}
}

async function injectTemplateContext(body) {
	if (body.mode !== "slides") return body

	const templateName = pickTemplateForMessage(body.message || "")
	const styleCtx = getTemplateStyleContext(templateName)
	const files = getTemplateFiles(templateName)
	if (!styleCtx || !files) return body

	const skillNotes = files.skill.split("\n").slice(0, 60).join("\n")
	const exampleSlideStr = styleCtx.exampleSlides.length > 0
		? `EXAMPLE SLIDES FROM THIS TEMPLATE (the visual target — reuse these exact layouts, classes, and decorative elements):
${styleCtx.exampleSlides.join("\n\n")}`
		: ""

	const message = `=== DESIGN TEMPLATE: ${templateName} ===
SKILL NOTES:
${skillNotes}

TEMPLATE CSS (for reference — the system injects the real stylesheet automatically, so DO NOT reproduce it; just use its classes/variables):
${styleCtx.fonts}

${styleCtx.css}

${exampleSlideStr}
=== END TEMPLATE ===

Create a complete presentation about: ${body.message}`

	console.log(`[Template] Slides request → ${templateName}`)
	return {
		...body,
		system: TEMPLATE_SLIDES_SYSTEM,
		message,
		__templateStyleBlock: buildTemplateStyleBlock(styleCtx),
	}
}

export const generateWithGeminiController = async (req, res) => {
	try {
		const userId = req.user?.sub ?? null
		const admin = await isAdminUser(userId)
		const { model: requestedModel, history: rawHistory, ...rawBody } = req.body ?? {}

		const history = await buildCompressedHistory(rawHistory)
		const body = await injectTemplateContext({ ...rawBody, history })
		const styleBlock = body.__templateStyleBlock || null

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
				return res.type("application/json").send(applyStylesToGeminiRaw(r.raw, styleBlock))
			}

			const r = await generateWithChatGPT({ ...body, model })
			if (!r.ok) {
				let details
				try { details = JSON.parse(r.raw) } catch { details = r.raw }
				console.error("[GPT] upstream error:", r.status, typeof details === "object" ? JSON.stringify(details).slice(0, 300) : String(details).slice(0, 300))
				return res.status(502).json({ error: "GPT-4o upstream error", status: r.status, details })
			}
			const data = JSON.parse(r.raw)
			let text = data.text || ""
			if (styleBlock) text = injectAuthoritativeStyles(text, styleBlock)
			return res.json({ text })
		}

		console.log(`[AI Router] User ${userId ?? 'anon'} → Gemini fallback`)
		const r = await generateWithGeminiFallback({ ...body })
		if (!r.ok) {
			let details
			try { details = JSON.parse(r.raw) } catch { details = r.raw }
			console.error("[Gemini fallback] upstream error:", r.status, typeof details === "object" ? JSON.stringify(details).slice(0, 300) : String(details).slice(0, 300))
			return res.status(502).json({ error: "Gemini upstream error", status: r.status, details })
		}
		res.type("application/json").send(applyStylesToGeminiRaw(r.raw, styleBlock))
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
