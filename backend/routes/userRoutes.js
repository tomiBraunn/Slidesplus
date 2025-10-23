import express from "express"
import auth from "../middlewares/auth.js"
import { upload } from "../middlewares/upload.js"
import { getMe, updateMe, uploadAvatar, deleteAvatar, regenerateAvatar } from "../controllers/userController.js"

const router = express.Router()
router.get("/me", auth, getMe)
router.patch("/users/me", auth, updateMe)
router.post("/users/me/avatar", auth, upload.single("avatar"), uploadAvatar)
router.delete("/users/me/avatar", auth, deleteAvatar)
router.patch("/users/me/avatar/regenerate", auth, regenerateAvatar)
export default router
