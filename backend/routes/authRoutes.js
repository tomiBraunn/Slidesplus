import express from "express"
import { createUser, registerUser, login } from "../controllers/authController.js"

const router = express.Router()
router.post("/createuser", createUser)
router.post("/auth/register", registerUser)
router.post("/login", login)
export default router
