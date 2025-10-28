import express from "express"
import auth from "../middlewares/auth.js"
import * as ctrl from "../controllers/versionController.js"

const router = express.Router()

router.post("/projects/:projectId/versions", auth, ctrl.createVersion)
router.get("/projects/:projectId/versions", auth, ctrl.listVersions)
router.get("/projects/:projectId/versions/:versionId", auth, ctrl.getVersion)
router.post("/projects/:projectId/versions/:versionId/restore", auth, ctrl.restoreVersion)
router.delete("/projects/:projectId/versions/:versionId", auth, ctrl.deleteVersion)

export default router