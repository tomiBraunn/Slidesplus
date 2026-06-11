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
			const skillPath = path.join(TEMPLATES_DIR, name, "SKILL.md")
			if (!fs.existsSync(skillPath)) return null

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
	if (!fs.existsSync(examplePath)) return null
	const html = fs.readFileSync(examplePath, "utf8")

	// Extract all <style> blocks
	const styleMatches = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
	const allCss = styleMatches.map(m => m[1]).join("\n")

	// Extract @import / font lines
	const fontLines = allCss.split("\n")
		.filter(l => l.trim().startsWith("@import") || l.trim().startsWith("@font-face"))
		.join("\n")

	// Remove rules that only apply to the viewport navigation engine
	let cleanCss = allCss
		.replace(/\.progress\s*\{[^}]*\}/g, "")
		.replace(/\.counter\s*\{[^}]*\}/g, "")
		.replace(/\.hint\s*\{[^}]*\}/g, "")
		.replace(/\.slides\s*\{[^}]*\}/g, "")
		.replace(/\.nav-hint\s*\{[^}]*\}/g, "")
		.replace(/\.slide\s*\{[^}]*\}/g, "")
		.replace(/\.slide\.active\s*\{[^}]*\}/g, "")
		.replace(/\.deck\s*\{[^}]*\}/g, "")
		.replace(/\.stage\s*\{[^}]*\}/g, "")
		.replace(/\.stage::before\s*\{[^}]*\}/g, "")
		.replace(/body:hover[^}]*\}/g, "")
		.replace(/html,\s*body\s*\{[^}]*\}/g, "")
		.replace(/\*\s*\{[^}]*\}/g, "")
		// Remove transition/animation properties (not needed for static)
		.replace(/transition\s*:[^;]+;/g, "")
		.replace(/animation\s*:[^;]+;/g, "")

	// Convert viewport units to px equivalents for 1920x1080
	cleanCss = convertToFixedPx(cleanCss)

	// Remove position:fixed (would escape the section bounds)
	cleanCss = cleanCss.replace(/position\s*:\s*fixed/g, "position: absolute")

	// Use the converted slides-plus.html sections as layout examples (already in correct format)
	const slidesPlusPath = path.join(dir, "slides-plus.html")
	const slidesPlusRaw = fs.existsSync(slidesPlusPath) ? fs.readFileSync(slidesPlusPath, "utf8") : ""
	const exampleSlides = []
	let pos = 0
	for (let i = 0; i < 3; i++) {
		const start = slidesPlusRaw.indexOf("<section", pos)
		const end = slidesPlusRaw.indexOf("</section>", start)
		if (start === -1 || end === -1) break
		// Skip the first section if it only contains the <style> block (no real layout)
		const sectionContent = slidesPlusRaw.slice(start, end + 10)
		const hasLayout = sectionContent.replace(/<style>[\s\S]*?<\/style>/, "").replace(/<section[^>]*>/, "").trim().length > 50
		if (hasLayout) exampleSlides.push(sectionContent)
		pos = end + 10
	}

	// Keep only up to 10000 chars of CSS
	const trimmed = cleanCss.length > 10000 ? cleanCss.slice(0, 10000) + "\n/* ...truncated */" : cleanCss

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
