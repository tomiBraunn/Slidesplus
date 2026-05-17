import express from "express"
import auth from "../middlewares/auth.js"
import { createUser, registerUser, syncPassword, login } from "../controllers/authController.js"

const router = express.Router()
router.post("/createuser", createUser)
router.post("/auth/register", registerUser)
router.post("/auth/sync-password", auth, syncPassword)
router.post("/login", login)
export default router
