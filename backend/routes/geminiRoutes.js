import express from "express"
import { generateWithGeminiController, testGemini } from "../controllers/geminiController.js"

const router = express.Router()
router.post("/gemini", generateWithGeminiController)
router.get("/gemini/test", testGemini)
export default router
