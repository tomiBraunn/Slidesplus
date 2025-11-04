import { Router } from "express"
import { auth } from "../middlewares/auth.js"
import {
	getStatus,
	getAuthUrl,
	handleCallback,
	getCurrentTrack,
	play,
	pause,
	toggleShuffle,
	cycleRepeat,
	disconnect,
} from "../controllers/spotifyController.js"

const router = Router()

// Check connection status
router.get("/status", auth, getStatus)

// Get OAuth URL
router.get("/auth-url", auth, getAuthUrl)

// OAuth callback (no auth required - user identified by state param)
router.get("/callback", handleCallback)

// Get current track
router.get("/current-track", auth, getCurrentTrack)

// Playback controls
router.post("/play", auth, play)
router.post("/pause", auth, pause)
router.post("/shuffle", auth, toggleShuffle)
router.post("/repeat", auth, cycleRepeat)

// Disconnect
router.post("/disconnect", auth, disconnect)

export default router
