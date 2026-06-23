import express from "express"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs"
import { generateWithGeminiController, testGemini } from "../controllers/geminiController.js"
import { slidesAgentController } from "../controllers/slidesAgentController.js"
import { wizardQuestionsController } from "../controllers/wizardController.js"
import { generateImageController } from "../controllers/imageController.js"
import { getTemplateCatalog } from "../services/templateService.js"
import { optionalAuth } from "../middlewares/auth.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = path.join(__dirname, "..", "templates")

const router = express.Router()
router.post("/gemini", optionalAuth, generateWithGeminiController)
router.post("/gemini/slides-agent", optionalAuth, slidesAgentController)
router.post("/gemini/wizard-questions", optionalAuth, wizardQuestionsController)
router.post("/gemini/image", optionalAuth, generateImageController)
router.get("/gemini/test", testGemini)
router.get("/templates", (_req, res) => res.json(getTemplateCatalog()))
router.get("/templates/:name/preview", (req, res) => {
	const name = path.basename(req.params.name)
	const filePath = path.join(TEMPLATES_DIR, name, "example.html")
	if (!fs.existsSync(filePath)) return res.status(404).send("Not found")
	res.setHeader("Content-Type", "text/html")
	res.setHeader("X-Frame-Options", "ALLOWALL")
	res.sendFile(filePath)
})
export default router
