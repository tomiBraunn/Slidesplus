import express from "express"
import { auth } from "../middlewares/auth.js"
import * as collaborationController from "../controllers/collaborationController.js"

const router = express.Router()

router.get(
    "/projects/:projectId/access",
    auth,
    collaborationController.getProjectAccess
)

router.patch(
    "/projects/:projectId/visibility",
    auth,
    collaborationController.updateProjectVisibility
)

router.post(
    "/projects/:projectId/collaborators",
    auth,
    collaborationController.addCollaborator
)

router.delete(
    "/projects/:projectId/collaborators/:userId",
    auth,
    collaborationController.removeCollaborator
)

export default router