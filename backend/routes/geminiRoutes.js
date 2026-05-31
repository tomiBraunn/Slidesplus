import express from "express"
import { generateWithGeminiController, testGemini } from "../controllers/geminiController.js"
import { optionalAuth } from "../middlewares/auth.js"

const router = express.Router()
router.post("/gemini", optionalAuth, generateWithGeminiController)
router.get("/gemini/test", testGemini)
export default router
