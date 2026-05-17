import express from "express"
// ChatGPT routes are disabled (Option A) to keep the code non-destructive.
// To re-enable, import the controller and uncomment the route registrations below.
import { testChatGPT } from "../controllers/chatgptController.js"

const router = express.Router()

// router.post("/chatgpt", generateWithChatGPTController)
// router.get("/chatgpt/test", testChatGPT)

export default router
