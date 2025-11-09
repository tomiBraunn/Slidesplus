import express from "express"
import { generateWithChatGPTController, testChatGPT } from "../controllers/chatgptController.js"

const router = express.Router()
router.post("/chatgpt", generateWithChatGPTController)
router.get("/chatgpt/test", testChatGPT)
export default router
