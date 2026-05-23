import express from "express"
import auth, { optionalAuth } from "../middlewares/auth.js"
import { upload } from "../middlewares/upload.js"
import * as ctrl from "../controllers/projectController.js"

const router = express.Router()

// AI generation (with file uploads)
router.post("/projects/ai/generate", auth, upload.array("files", 10), ctrl.generateProjectWithAI)

router.get("/projects", auth, ctrl.listProjects)
router.post("/projects", auth, ctrl.createProject)
router.get("/v/:id", optionalAuth, ctrl.getPublicProject)
router.get("/projects/:id", optionalAuth, ctrl.getProject)
router.get("/projects/:id/access", auth, ctrl.checkAccess)
router.patch("/projects/:id", auth, ctrl.updateProject)
router.put("/projects/:id/visibility", auth, ctrl.updateProjectVisibility)
router.delete("/projects/:id", auth, ctrl.deleteProject)

router.get("/projects/:id/slides", auth, ctrl.getSlides)
router.post("/projects/:id/slides", auth, ctrl.saveSlides)

router.post("/projects/:id/upload", auth, upload.single("file"), ctrl.uploadProjectFile)

router.get("/projects/:id/chat", auth, ctrl.getChat)
router.post("/projects/:id/chat", auth, ctrl.postChat)
router.delete("/projects/:id/chat", auth, ctrl.clearChat)

// Auto-save and version history (project_changes)
router.post("/projects/:projectId/auto-save", auth, ctrl.autoSaveProject)
router.get("/projects/:projectId/versions", auth, ctrl.getProjectVersions)
router.post("/projects/:projectId/versions", auth, ctrl.createProjectSnapshot)
router.post("/projects/:projectId/versions/:versionId/restore", auth, ctrl.restoreProjectVersion)
router.post("/projects/:projectId/versions/:versionId/duplicate", auth, ctrl.duplicateProjectFromVersion)

export default router