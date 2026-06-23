import { generateWithGemini, generateWithGeminiFallback } from "../services/geminiService.js"
import { generateWithChatGPT } from "../services/chatgptService.js"
import { generateWithNvidia, isNvidiaModel } from "../services/nvidiaService.js"
import { pool } from "../config/database.js"

async function isAdminUser(userId) {
	if (!pool || !userId) return false
	try {
		const r = await pool.query("SELECT is_admin FROM users WHERE id=$1", [userId])
		return r.rows[0]?.is_admin === true
	} catch { return false }
}

// Genera 3-5 preguntas multiple-choice a medida de la idea del usuario, para
// afinar la presentación antes de generarla (estilo onboarding de Claude).
const WIZARD_SYSTEM = `You are a presentation planning assistant. Given a user's idea for a slide deck, produce 3 to 5 short multiple-choice questions that will help tailor the deck (audience, tone, depth, focus, length, etc.). Adapt the questions to the SPECIFIC topic — e.g. an investor pitch should ask about funding stage; a biology class about education level.

Return ONLY valid JSON, no markdown, no prose. Exact shape:
{
  "questions": [
    {
      "question": "Short question text",
      "options": [
        { "label": "Short label", "sublabel": "optional hint", "value": "a phrase the deck generator can use" }
      ]
    }
  ]
}

RULES:
- 3 to 5 questions. Each with 2 to 4 options (so they map to keys 1-4).
- "value" must be a natural-language phrase that can be injected into a generation prompt (e.g. "an audience of potential investors, persuasive and concise").
- Always include a question about the number of slides with options like 5/8/10/15 (value = the number as a string).
- Do NOT ask about visual style/template — that is chosen separately with previews.
- Keep labels under ~3 words. Respond in the same language as the user's idea.`

export const wizardQuestionsController = async (req, res) => {
	try {
		const userId = req.user?.sub ?? null
		const admin = await isAdminUser(userId)
		const { idea, model: requestedModel } = req.body ?? {}
		if (!idea || !String(idea).trim()) return res.status(400).json({ error: "Missing idea" })

		const message = `User's presentation idea: ${String(idea).trim()}\n\nGenerate the tailoring questions now.`

		let rawText = ""
		if (admin) {
			const model = requestedModel || "gpt-4o"
			if (model.startsWith("gemini-")) {
				const r = await generateWithGemini({ system: WIZARD_SYSTEM, message, model })
				if (r.ok) rawText = JSON.parse(r.raw).candidates?.[0]?.content?.parts?.[0]?.text || ""
			} else if (isNvidiaModel(model)) {
				const r = await generateWithNvidia({ system: WIZARD_SYSTEM, message, model })
				if (r.ok) rawText = JSON.parse(r.raw).text || ""
			} else {
				const r = await generateWithChatGPT({ system: WIZARD_SYSTEM, message, model })
				if (r.ok) rawText = JSON.parse(r.raw).text || ""
			}
		} else {
			const r = await generateWithGeminiFallback({ system: WIZARD_SYSTEM, message })
			if (r.ok) rawText = JSON.parse(r.raw).candidates?.[0]?.content?.parts?.[0]?.text || ""
		}

		// Parseo tolerante: limpiar fences y intentar JSON; extraer el objeto si viene con texto extra.
		const cleaned = String(rawText).replace(/^```[\w]*\n?/m, "").replace(/\n?```$/m, "").trim()
		let parsed
		try {
			parsed = JSON.parse(cleaned)
		} catch {
			const m = cleaned.match(/\{[\s\S]*\}/)
			if (m) { try { parsed = JSON.parse(m[0]) } catch { /* noop */ } }
		}

		const questions = Array.isArray(parsed?.questions) ? parsed.questions : null
		if (!questions || questions.length === 0) {
			return res.status(502).json({ error: "Could not generate questions" })
		}

		// Sanear: máx 5 preguntas, máx 4 opciones, campos string.
		const safe = questions.slice(0, 5).map((q) => ({
			question: String(q.question || "").slice(0, 200),
			options: (Array.isArray(q.options) ? q.options : []).slice(0, 4).map((o) => ({
				label: String(o.label || "").slice(0, 60),
				sublabel: o.sublabel ? String(o.sublabel).slice(0, 80) : undefined,
				value: String(o.value ?? o.label ?? "").slice(0, 200),
			})),
		})).filter((q) => q.question && q.options.length >= 2)

		if (safe.length === 0) return res.status(502).json({ error: "Could not generate questions" })
		return res.json({ ok: true, questions: safe })
	} catch (err) {
		console.error("[Wizard] Error:", err)
		res.status(500).json({ error: "Wizard error", details: err instanceof Error ? err.message : String(err) })
	}
}
