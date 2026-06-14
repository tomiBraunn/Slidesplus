import test from "node:test"
import assert from "node:assert/strict"
import { matchExplicitTemplate, matchTemplateByTrigger, pickTemplateForMessage, getTemplateStyleContext, getTemplateCatalog } from "../services/templateService.js"

test("explicit full template name wins", () => {
	assert.equal(
		matchExplicitTemplate('Regenerate the presentation using the "html-ppt-zhangzara-mat" template'),
		"html-ppt-zhangzara-mat"
	)
})

test("estilo Mat picks the mat template", () => {
	assert.equal(
		pickTemplateForMessage("crea una presentacion de 10 slides usando el estilo Mat sobre nike"),
		"html-ppt-zhangzara-mat"
	)
})

test("mat does not match inside other words", () => {
	assert.notEqual(pickTemplateForMessage("una presentacion sobre formato de archivos"), "html-ppt-zhangzara-mat")
	assert.notEqual(pickTemplateForMessage("slides sobre matematicas para la escuela"), "html-ppt-zhangzara-mat")
})

test("slug match still works for longer names", () => {
	assert.equal(pickTemplateForMessage("crea un deck estilo broadside sobre IA"), "html-ppt-zhangzara-broadside")
	assert.equal(pickTemplateForMessage("slides con el estilo vellum para una galeria"), "html-ppt-zhangzara-vellum")
})

test("shared triggers are ignored, falls back to default", () => {
	// "html slides" appears as trigger in many templates — must not force one of them
	const picked = pickTemplateForMessage("crea html slides sobre recetas de cocina")
	assert.equal(picked, "open-design-landing-deck")
})

test("unique trigger from SKILL.md matches", () => {
	const byTrigger = matchTemplateByTrigger("quiero algo warm-modern para mi estudio")
	assert.equal(byTrigger, "html-ppt-zhangzara-mat")
})

test("style context includes fonts even when example uses <link> tags", () => {
	const ctx = getTemplateStyleContext("html-ppt-zhangzara-mat")
	assert.ok(ctx.fonts.includes("Bricolage"), `expected Bricolage in fonts, got: ${ctx.fonts}`)
	assert.ok(ctx.fonts.includes("@import"), "fonts must be @import lines (no <link> allowed in sections)")
})

// This is the real fix: EVERY template must produce a usable generation context,
// not just Mat. A template whose example slides use classes but whose CSS is
// empty renders blank — the exact bug reported.
test("every template produces a usable generation context", () => {
	const weak = []
	for (const t of getTemplateCatalog()) {
		const ctx = getTemplateStyleContext(t.name)
		if (!ctx) { weak.push(`${t.name}: no context`); continue }
		if (ctx.exampleSlides.length === 0) { weak.push(`${t.name}: 0 example slides`); continue }
		const classRefs = (ctx.exampleSlides.join(" ").match(/class=/g) || []).length
		// If the example slides lean on classes, the CSS must actually define them
		if (classRefs > 5 && ctx.css.length < 500) {
			weak.push(`${t.name}: ${classRefs} class refs but only ${ctx.css.length} chars of CSS`)
		}
	}
	assert.equal(weak.length, 0, `templates with weak/empty context:\n  ${weak.join("\n  ")}`)
})

test("keyword table still applies", () => {
	assert.equal(pickTemplateForMessage("presentacion para inversores, pitch de fundraising"), "html-ppt-pitch-deck")
})
