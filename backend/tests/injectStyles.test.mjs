import test from "node:test"
import assert from "node:assert/strict"

// Re-implement the two pure helpers' contract via import. They aren't exported
// from the controller, so we test the behavior through a tiny local copy kept
// in sync with geminiController.js. If these break, the controller logic does too.
// (Exported here to keep a single source of truth.)
import { buildTemplateStyleBlock, injectAuthoritativeStyles } from "../controllers/geminiController.js"
import { getTemplateStyleContext } from "../services/templateService.js"

test("style block contains real class definitions, not just :root", () => {
	const ctx = getTemplateStyleContext("html-ppt-zhangzara-vellum")
	const block = buildTemplateStyleBlock(ctx)
	assert.ok(block.includes(".h2"), "must include .h2 class rule")
	assert.ok(block.includes(".bullet-list"), "must include .bullet-list class rule")
	assert.ok(block.includes(".display"), "must include .display class rule")
	assert.ok(block.includes("@import"), "must include font @import")
	assert.ok(!/\bhtml\s*,\s*body\b/.test(block), "html,body selectors must be rewritten to section")
})

test("style block applies the template background+color directly to section", () => {
	const ctx = getTemplateStyleContext("html-ppt-zhangzara-vellum")
	const block = buildTemplateStyleBlock(ctx)
	// Vellum: bg #2a3870, fg #E8D85C — must land on a bare section{} rule
	const sectionRule = (block.match(/section\{[^}]*\}/g) || []).find(r => r.includes("background"))
	assert.ok(sectionRule, "must emit a section{} base rule with background")
	assert.ok(sectionRule.includes("#2a3870"), `section bg must be the template navy, got: ${sectionRule}`)
	assert.ok(sectionRule.includes("#E8D85C"), `section color must be the template yellow, got: ${sectionRule}`)
})

test("model's inline var(--paper) background is stripped", () => {
	const styleBlock = "<style>section{background:#2a3870;color:#E8D85C}</style>"
	const html = `<section style="width:1920px;height:1080px;position:relative;background:var(--paper, #fff);"><h2 class="h2">Hi</h2></section>`
	const out = injectAuthoritativeStyles(html, styleBlock)
	assert.ok(!/var\(\s*--paper/.test(out), "inline var(--paper) bg must be removed")
	assert.ok(out.includes("width:1920px"), "other inline styles preserved")
})

test("model-emitted <style> is replaced with the authoritative one", () => {
	const styleBlock = "<style>.h2{font-size:77px}</style>"
	const modelHtml = `<section style="background:var(--c-bg)"><style>:root{--c-bg:#2a3870}</style><h2 class="h2">Hi</h2></section>
<section style="background:var(--c-bg)"><h2 class="h2">Two</h2></section>`
	const out = injectAuthoritativeStyles(modelHtml, styleBlock)
	// The model's partial :root-only <style> must be gone
	assert.ok(!out.includes(":root{--c-bg:#2a3870}"), "model's partial style removed")
	// The authoritative class rule must be present exactly once
	assert.equal((out.match(/font-size:77px/g) || []).length, 1, "authoritative style injected once")
	// Classes preserved
	assert.ok(out.includes('class="h2"'), "classes preserved")
	// Two sections still present
	assert.equal((out.match(/<section/g) || []).length, 2)
})

test("sections with no style still get the block injected once", () => {
	const styleBlock = "<style>.x{color:red}</style>"
	const html = `<section><p>a</p></section><section><p>b</p></section>`
	const out = injectAuthoritativeStyles(html, styleBlock)
	assert.equal((out.match(/<style>/g) || []).length, 1)
})

test("no sections -> returned unchanged", () => {
	assert.equal(injectAuthoritativeStyles("just text", "<style>x</style>"), "just text")
})
