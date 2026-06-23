import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = path.join(__dirname, "..", "templates")

let _catalog = null

export function getTemplateCatalog() {
	if (_catalog) return _catalog

	const entries = fs.readdirSync(TEMPLATES_DIR, { withFileTypes: true })
		.filter(e => e.isDirectory())
		.map(e => {
			const name = e.name
			const dir = path.join(TEMPLATES_DIR, name)
			const skillPath = path.join(dir, "SKILL.md")
			if (!fs.existsSync(skillPath)) return null

			// Skip templates whose styling lives in an external .css file that was
			// never bundled into the repo — their classes are undefined, so they
			// would generate blank slides (e.g. pin-and-paper → assets/styles.css).
			const examplePath = path.join(dir, "example.html")
			if (fs.existsSync(examplePath)) {
				const exampleHtml = fs.readFileSync(examplePath, "utf8")
				const hasInlineStyleBlock = /<style[^>]*>[\s\S]*?\.[a-zA-Z][\w-]*\s*[{,]/.test(exampleHtml)
				const externalCss = [...exampleHtml.matchAll(/href=["']([^"']+\.css)["']/gi)].map(m => m[1])
				const missingExternalCss = externalCss.some(href => !fs.existsSync(path.join(dir, href)))
				if (!hasInlineStyleBlock && missingExternalCss) {
					console.warn(`[Template] Skipping ${name}: CSS is in a missing external file (${externalCss.join(", ")})`)
					return null
				}
			}

			const skill = fs.readFileSync(skillPath, "utf8")

			// Extract description from frontmatter
			const descMatch = skill.match(/^description:\s*[|>]?\s*\n?([\s\S]*?)(?=\ntriggers:|\nod:|\n---|\n#)/m)
				|| skill.match(/^description:\s*(.+)$/m)
			let description = descMatch ? descMatch[1].trim().replace(/^["']|["']$/g, "").replace(/\n\s*/g, " ") : ""
			// Trim to ~200 chars
			if (description.length > 200) description = description.slice(0, 197) + "..."

			return { name, description }
		})
		.filter(Boolean)

	_catalog = entries
	return _catalog
}

export function getTemplateFiles(name) {
	const dir = path.join(TEMPLATES_DIR, name)
	if (!fs.existsSync(dir)) return null

	const skillPath = path.join(dir, "SKILL.md")
	const examplePath = path.join(dir, "example.html")
	const slidesPlusPath = path.join(dir, "slides-plus.html")

	const skill = fs.existsSync(skillPath) ? fs.readFileSync(skillPath, "utf8") : ""
	// Only use first 150 lines of example.html (CSS variables + font imports, skip slide content)
	const exampleRaw = fs.existsSync(examplePath) ? fs.readFileSync(examplePath, "utf8") : ""
	const example = exampleRaw.split("\n").slice(0, 150).join("\n")

	// Slides Plus format: first section only (contains CSS vars + fonts)
	const slidesPlusRaw = fs.existsSync(slidesPlusPath) ? fs.readFileSync(slidesPlusPath, "utf8") : ""
	const firstSectionEnd = slidesPlusRaw.indexOf("</section>")
	const slidesPlus = firstSectionEnd > -1
		? slidesPlusRaw.slice(0, firstSectionEnd + 10)
		: slidesPlusRaw.split("\n").slice(0, 120).join("\n")

	return { skill, example, slidesPlus }
}

export function getSlidesPlusContent(name) {
	const slidesPlusPath = path.join(TEMPLATES_DIR, name, "slides-plus.html")
	if (!fs.existsSync(slidesPlusPath)) return null
	return fs.readFileSync(slidesPlusPath, "utf8")
}

// Convert vw/vh/clamp() values to fixed px equivalents for a 1920x1080 canvas
function convertToFixedPx(css) {
	// clamp(minpx, Xvw, maxpx) → use the vw value at 1920px width
	css = css.replace(/clamp\(\s*([\d.]+)px\s*,\s*([\d.]+)vw\s*,\s*([\d.]+)px\s*\)/g, (_, min, vw, max) => {
		const val = Math.round(parseFloat(vw) * 1920 / 100)
		return `${Math.min(Math.max(val, parseFloat(min)), parseFloat(max))}px`
	})
	css = css.replace(/clamp\(\s*([\d.]+)px\s*,\s*min\(([^)]+)\)\s*,\s*([\d.]+)px\s*\)/g, (_, min, inner, max) => {
		const vwMatch = inner.match(/([\d.]+)vw/)
		const vhMatch = inner.match(/([\d.]+)vh/)
		const vwVal = vwMatch ? parseFloat(vwMatch[1]) * 1920 / 100 : Infinity
		const vhVal = vhMatch ? parseFloat(vhMatch[1]) * 1080 / 100 : Infinity
		const val = Math.round(Math.min(vwVal, vhVal))
		return `${Math.min(Math.max(val, parseFloat(min)), parseFloat(max))}px`
	})
	// clamp(minpx, Xvh, maxpx)
	css = css.replace(/clamp\(\s*([\d.]+)px\s*,\s*([\d.]+)vh\s*,\s*([\d.]+)px\s*\)/g, (_, min, vh, max) => {
		const val = Math.round(parseFloat(vh) * 1080 / 100)
		return `${Math.min(Math.max(val, parseFloat(min)), parseFloat(max))}px`
	})
	// bare Xvw / Xvh
	css = css.replace(/([\d.]+)vw/g, (_, n) => `${Math.round(parseFloat(n) * 1920 / 100)}px`)
	css = css.replace(/([\d.]+)vh/g, (_, n) => `${Math.round(parseFloat(n) * 1080 / 100)}px`)
	return css
}

export function getTemplateStyleContext(name) {
	const dir = path.join(TEMPLATES_DIR, name)
	if (!fs.existsSync(dir)) return null

	const examplePath = path.join(dir, "example.html")
	const slidesPlusPath = path.join(dir, "slides-plus.html")
	if (!fs.existsSync(examplePath) && !fs.existsSync(slidesPlusPath)) return null

	const html = fs.existsSync(examplePath) ? fs.readFileSync(examplePath, "utf8") : ""
	const slidesPlusHtml = fs.existsSync(slidesPlusPath) ? fs.readFileSync(slidesPlusPath, "utf8") : ""

	const collectCss = (src) => [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join("\n")

	// CSS that defines the template's classes/variables. Some templates keep it
	// in example.html, others only in slides-plus.html (where the example slides
	// live). If example.html has no usable <style>, fall back to slides-plus so
	// the example slides we send the model aren't full of undefined classes.
	let allCss = collectCss(html)
	if (allCss.replace(/@import[^;]+;/g, "").trim().length < 200) {
		allCss = collectCss(slidesPlusHtml) || allCss
	}

	// Extract @import / font lines
	let fontLines = allCss.split("\n")
		.filter(l => l.trim().startsWith("@import") || l.trim().startsWith("@font-face"))
		.join("\n")

	// Some templates load fonts via <link rel="stylesheet"> instead — convert
	// those to @import lines (sections can't carry <link> tags)
	if (!fontLines) {
		const linkHrefs = [...(html + slidesPlusHtml).matchAll(/<link[^>]*href=["']([^"']+)["'][^>]*>/gi)]
			.map(m => m[1].replace(/\s+/g, ""))
			.filter(href => /fonts\.googleapis\.com\/css/.test(href))
		fontLines = [...new Set(linkHrefs)].map(href => `@import url('${href}');`).join("\n")
	}

	// Remove rules that only apply to the viewport navigation engine
	let cleanCss = allCss
		// Strip big ASCII-art comment blocks — pure prompt/byte bloat
		.replace(/\/\*[\s\S]*?\*\//g, "")
		// Navigation-engine chrome targeted by id (#deck, #nav-dots, #slide-counter)
		.replace(/#[\w-]+\s*\{[^}]*\}/g, "")
		.replace(/\.progress\s*\{[^}]*\}/g, "")
		.replace(/\.counter\s*\{[^}]*\}/g, "")
		.replace(/\.hint\s*\{[^}]*\}/g, "")
		.replace(/\.slides\s*\{[^}]*\}/g, "")
		.replace(/\.nav-hint\s*\{[^}]*\}/g, "")
		.replace(/\.nav-dot[\w.-]*\s*\{[^}]*\}/g, "")
		.replace(/\.slide\s*\{[^}]*\}/g, "")
		.replace(/\.slide\.active\s*\{[^}]*\}/g, "")
		.replace(/\.deck\s*\{[^}]*\}/g, "")
		.replace(/\.stage\s*\{[^}]*\}/g, "")
		.replace(/\.stage::before\s*\{[^}]*\}/g, "")
		.replace(/body:hover[^}]*\}/g, "")
		.replace(/\*\s*\{[^}]*\}/g, "")
		// Remove transition/animation properties (not needed for static)
		.replace(/transition\s*:[^;]+;/g, "")
		.replace(/animation\s*:[^;]+;/g, "")
		// Collapse the blank lines left by all the removals
		.replace(/\n\s*\n\s*\n+/g, "\n\n")

	// Convert viewport units to px equivalents for 1920x1080
	cleanCss = convertToFixedPx(cleanCss)

	// Remove position:fixed (would escape the section bounds)
	cleanCss = cleanCss.replace(/position\s*:\s*fixed/g, "position: absolute")

	// Use the slides-plus.html sections as layout examples (already in correct format)
	const slidesPlusRaw = slidesPlusHtml
	const exampleSlides = []
	let pos = 0
	for (let i = 0; i < 6; i++) {
		const start = slidesPlusRaw.indexOf("<section", pos)
		const end = slidesPlusRaw.indexOf("</section>", start)
		if (start === -1 || end === -1) break
		// Skip the first section if it only contains the <style> block (no real layout)
		const sectionContent = slidesPlusRaw.slice(start, end + 10)
		const hasLayout = sectionContent.replace(/<style>[\s\S]*?<\/style>/, "").replace(/<section[^>]*>/, "").trim().length > 50
		if (hasLayout) exampleSlides.push(sectionContent)
		pos = end + 10
	}

	// The full stylesheet is injected into the deck deterministically (not just
	// shown to the model), so it MUST be complete — truncating drops layout
	// classes like .slide--stats / .compare-panel and breaks those slides.
	// Cap only as a runaway guard, on a clean rule boundary so we never cut a
	// rule mid-body.
	let trimmed = cleanCss.trim()
	if (trimmed.length > 60000) {
		const cut = trimmed.lastIndexOf("}", 60000)
		trimmed = trimmed.slice(0, cut > 0 ? cut + 1 : 60000)
	}

	return {
		fonts: fontLines,
		css: trimmed,
		exampleSlides,
	}
}

export function buildTemplateCatalogPrompt() {
	const catalog = getTemplateCatalog()
	const lines = catalog.map(t => `- ${t.name}: ${t.description}`)
	return lines.join("\n")
}

/* ── Template selection from a user message ──────────────────────────── */

const TEMPLATE_KEYWORDS = [
	{ name: "html-ppt-zhangzara-signal",           keys: ["finance", "financiero", "consulting", "executive", "authority", "formal", "inversion", "inversión", "bank", "banco"] },
	{ name: "ib-pitch-book",                        keys: ["m&a", "investment banking", "pitch book", "valuation", "merger", "acquisition"] },
	{ name: "html-ppt-zhangzara-broadside",         keys: ["tech", "startup", "producto", "product", "dark", "developer", "engineering", "software"] },
	{ name: "html-ppt-zhangzara-studio",            keys: ["agencia", "agency", "branding", "creative agency", "bold", "diseño", "design studio"] },
	{ name: "html-ppt-zhangzara-bold-poster",       keys: ["manifesto", "brand", "marca", "founder", "vision", "poster", "creative"] },
	{ name: "html-ppt-taste-editorial",             keys: ["editorial", "investor memo", "report", "reporte", "annual", "anual", "minimalist", "minimal"] },
	{ name: "html-ppt-zhangzara-grove",             keys: ["nature", "naturaleza", "sustainability", "sustentabilidad", "eco", "green", "wellness", "ambiente"] },
	{ name: "html-ppt-zhangzara-vellum",            keys: ["art", "arte", "gallery", "galeria", "luxury", "lujo", "fashion", "moda"] },
	{ name: "html-ppt-zhangzara-soft-editorial",    keys: ["culture", "cultura", "lifestyle", "soft", "elegant"] },
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

const DEFAULT_TEMPLATE = "open-design-landing-deck"

function escapeRegex(s) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// Word-boundary test that treats hyphens as word chars, so "mat" does not
// match inside "zhangzara-mat" or "formato", but "warm-modern" matches whole.
function containsWord(haystack, word) {
	const re = new RegExp(`(^|[^\\p{L}\\p{N}-])${escapeRegex(word)}($|[^\\p{L}\\p{N}-])`, "iu")
	return re.test(haystack)
}

let _triggerIndex = null

// Triggers parsed from each template's SKILL.md frontmatter. Triggers shared
// by more than one template (e.g. "html slides") are dropped — they carry no
// selection signal. Longest triggers are tried first (most specific wins).
export function getTriggerIndex() {
	if (_triggerIndex) return _triggerIndex

	const counts = new Map()
	const all = []
	for (const { name } of getTemplateCatalog()) {
		const skillPath = path.join(TEMPLATES_DIR, name, "SKILL.md")
		if (!fs.existsSync(skillPath)) continue
		const skill = fs.readFileSync(skillPath, "utf8")
		const block = skill.match(/^triggers:\s*\n([\s\S]*?)(?=^\S)/m)
		if (!block) continue
		for (const line of block[1].split("\n")) {
			const m = line.match(/^\s*-\s*["']?(.+?)["']?\s*$/)
			if (!m) continue
			const trigger = m[1].toLowerCase().trim()
			if (trigger.length < 3) continue
			counts.set(trigger, (counts.get(trigger) || 0) + 1)
			all.push({ trigger, name })
		}
	}

	_triggerIndex = all
		.filter(({ trigger }) => counts.get(trigger) === 1)
		.sort((a, b) => b.trigger.length - a.trigger.length)
	return _triggerIndex
}

// Full template name or unambiguous slug ("broadside", "vellum") in the message
export function matchExplicitTemplate(message) {
	const lower = String(message || "").toLowerCase()
	const names = getTemplateCatalog().map(t => t.name)
	for (const name of names) {
		if (lower.includes(name)) return name
	}
	for (const name of names) {
		const slug = name.replace(/^html-ppt-zhangzara-|^html-ppt-|^kami-|^open-design-/, "")
		if (slug.length > 3 && containsWord(lower, slug)) return name
	}
	return null
}

// Unique SKILL.md trigger ("mat", "warm-modern", ...) in the message
export function matchTemplateByTrigger(message) {
	const lower = String(message || "").toLowerCase()
	for (const { trigger, name } of getTriggerIndex()) {
		if (containsWord(lower, trigger)) return name
	}
	return null
}

export function pickTemplateForMessage(message) {
	const lower = String(message || "").toLowerCase()

	const explicit = matchExplicitTemplate(lower)
	if (explicit) {
		console.log(`[Template] Explicit match: ${explicit}`)
		return explicit
	}

	const byTrigger = matchTemplateByTrigger(lower)
	if (byTrigger) {
		console.log(`[Template] Trigger match: ${byTrigger}`)
		return byTrigger
	}

	for (const { name, keys } of TEMPLATE_KEYWORDS) {
		if (keys.some(k => lower.includes(k))) {
			console.log(`[Template] Keyword match: ${name}`)
			return name
		}
	}

	if (/apple|google|microsoft|amazon|tesla|tech company/.test(lower)) return "html-ppt-zhangzara-broadside"
	if (/marketing|ventas|sales/.test(lower)) return "html-ppt-zhangzara-studio"
	if (/historia|history|cultura|culture/.test(lower)) return "html-ppt-zhangzara-soft-editorial"
	if (/ciencia|science|medicina|medicine|health|salud/.test(lower)) return "html-ppt-zhangzara-cobalt-grid"

	console.log(`[Template] No match, using default`)
	return DEFAULT_TEMPLATE
}
