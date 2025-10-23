import express from "express"
import { createUser, login } from "../controllers/authController.js"

const router = express.Router()
router.post("/createuser", createUser)
router.post("/login", login)
export default router
