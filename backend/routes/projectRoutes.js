import express from "express"
import auth from "../middlewares/auth.js"
import { upload } from "../middlewares/upload.js"
import * as ctrl from "../controllers/projectController.js"

const router = express.Router()

router.get("/projects", auth, ctrl.listProjects)
router.post("/projects", auth, ctrl.createProject)
router.get("/projects/:id", auth, ctrl.getProject)
router.patch("/projects/:id", auth, ctrl.updateProject)
router.delete("/projects/:id", auth, ctrl.deleteProject)

router.get("/projects/:id/slides", auth, ctrl.getSlides)
router.post("/projects/:id/slides", auth, ctrl.saveSlides)
router.post("/projects/:id/upload", auth, upload.single("file"), ctrl.uploadProjectFile)

router.get("/projects/:id/chat", auth, ctrl.getChat)
router.post("/projects/:id/chat", auth, ctrl.postChat)
router.delete("/projects/:id/chat", auth, ctrl.clearChat)

router.post("/chat/upload", auth, upload.single("file"), ctrl.uploadChatFile)

export default router
