import {
	isSpotifyConnected,
	exchangeCodeForTokens,
	saveSpotifyConnection,
	callSpotifyAPI,
	deleteSpotifyConnection,
} from "../services/spotifyService.js"

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "14468f5ae0a94b568c669c6407347993"
const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production" || process.env.VERCEL

const SPOTIFY_REDIRECT_URI = isProduction
	? "https://slides-plus-backend.vercel.app/spotify/callback"
	: (process.env.SPOTIFY_REDIRECT_URI || "http://localhost:8000/spotify/callback")

const FRONTEND_URL = isProduction
	? "https://slidesplus.vercel.app"
	: (process.env.FRONTEND_URL || "http://localhost:5173")

/**
 * GET /spotify/status
 * Check if user has Spotify connected
 */
export const getStatus = async (req, res) => {
	try {
		const userId = req.user.sub
		const connected = await isSpotifyConnected(userId)
		res.json({ connected })
	} catch (err) {
		console.error("Error checking Spotify status:", err)
		res.status(500).json({ error: "Server error" })
	}
}

/**
 * GET /spotify/auth-url
 * Generate Spotify OAuth authorization URL
 */
export const getAuthUrl = async (req, res) => {
	try {
		const userId = req.user.sub

		const scopes = ["user-read-playback-state", "user-modify-playback-state", "user-read-currently-playing"]

		const url =
			"https://accounts.spotify.com/authorize?" +
			new URLSearchParams({
				response_type: "code",
				client_id: SPOTIFY_CLIENT_ID,
				scope: scopes.join(" "),
				redirect_uri: SPOTIFY_REDIRECT_URI,
				state: userId, // To identify user after OAuth
			})

		res.json({ url })
	} catch (err) {
		console.error("Error generating Spotify auth URL:", err)
		res.status(500).json({ error: "Server error" })
	}
}

/**
 * GET /spotify/callback
 * Handle Spotify OAuth callback
 */
export const handleCallback = async (req, res) => {
	try {
		const { code, state: userId } = req.query

		if (!code || !userId) {
			return res.status(400).send("Missing code or state")
		}

		// Exchange code for tokens
		const data = await exchangeCodeForTokens(code)

		// Save connection
		await saveSpotifyConnection(userId, data.access_token, data.refresh_token, data.expires_in)

		// Close popup window
		res.send("<script>window.close()</script>")
	} catch (err) {
		console.error("Error in Spotify callback:", err)
		res.status(500).send("Error connecting to Spotify")
	}
}

/**
 * GET /spotify/current-track
 * Get currently playing track
 */
export const getCurrentTrack = async (req, res) => {
	try {
		const userId = req.user.sub

		const response = await callSpotifyAPI(userId, "/me/player/currently-playing")

		// No content playing
		if (response.status === 204 || response.status === 404) {
			return res.json({ ok: true, track: null })
		}

		if (!response.ok) {
			return res.json({ ok: false, error: "Failed to fetch track" })
		}

		const data = await response.json()

		res.json({
			ok: true,
			track: {
				name: data.item?.name || "Unknown",
				artist: data.item?.artists?.map((a) => a.name).join(", ") || "Unknown",
				album_art: data.item?.album?.images?.[0]?.url || null,
				duration_ms: data.item?.duration_ms || 0,
				progress_ms: data.progress_ms || 0,
				is_playing: data.is_playing || false,
			},
		})
	} catch (err) {
		console.error("Error fetching current track:", err)
		if (err.message === "No valid Spotify access token") {
			return res.json({ ok: false, error: "Not connected" })
		}
		res.status(500).json({ ok: false, error: "Server error" })
	}
}

/**
 * POST /spotify/play
 * Resume playback
 */
export const play = async (req, res) => {
	try {
		const userId = req.user.sub

		const response = await callSpotifyAPI(userId, "/me/player/play", {
			method: "PUT",
		})

		if (!response.ok && response.status !== 204) {
			return res.status(500).json({ ok: false, error: "Failed to play" })
		}

		res.json({ ok: true })
	} catch (err) {
		console.error("Error playing track:", err)
		res.status(500).json({ ok: false, error: "Server error" })
	}
}

/**
 * POST /spotify/pause
 * Pause playback
 */
export const pause = async (req, res) => {
	try {
		const userId = req.user.sub

		const response = await callSpotifyAPI(userId, "/me/player/pause", {
			method: "PUT",
		})

		if (!response.ok && response.status !== 204) {
			return res.status(500).json({ ok: false, error: "Failed to pause" })
		}

		res.json({ ok: true })
	} catch (err) {
		console.error("Error pausing track:", err)
		res.status(500).json({ ok: false, error: "Server error" })
	}
}

/**
 * POST /spotify/shuffle
 * Toggle shuffle
 */
export const toggleShuffle = async (req, res) => {
	try {
		const userId = req.user.sub

		// Get current playback state
		const stateResponse = await callSpotifyAPI(userId, "/me/player")

		if (stateResponse.status === 204 || stateResponse.status === 404) {
			return res.status(404).json({ ok: false, error: "No active device" })
		}

		const state = await stateResponse.json()
		const currentShuffle = state.shuffle_state || false

		// Toggle shuffle
		const response = await callSpotifyAPI(userId, `/me/player/shuffle?state=${!currentShuffle}`, {
			method: "PUT",
		})

		if (!response.ok && response.status !== 204) {
			return res.status(500).json({ ok: false, error: "Failed to toggle shuffle" })
		}

		res.json({ ok: true })
	} catch (err) {
		console.error("Error toggling shuffle:", err)
		res.status(500).json({ ok: false, error: "Server error" })
	}
}

/**
 * POST /spotify/repeat
 * Cycle repeat mode (off → context → track → off)
 */
export const cycleRepeat = async (req, res) => {
	try {
		const userId = req.user.sub

		// Get current playback state
		const stateResponse = await callSpotifyAPI(userId, "/me/player")

		if (stateResponse.status === 204 || stateResponse.status === 404) {
			return res.status(404).json({ ok: false, error: "No active device" })
		}

		const state = await stateResponse.json()
		const currentRepeat = state.repeat_state || "off"

		// Cycle: off → context → track → off
		const nextRepeat = currentRepeat === "off" ? "context" : currentRepeat === "context" ? "track" : "off"

		// Set repeat mode
		const response = await callSpotifyAPI(userId, `/me/player/repeat?state=${nextRepeat}`, {
			method: "PUT",
		})

		if (!response.ok && response.status !== 204) {
			return res.status(500).json({ ok: false, error: "Failed to cycle repeat" })
		}

		res.json({ ok: true })
	} catch (err) {
		console.error("Error cycling repeat:", err)
		res.status(500).json({ ok: false, error: "Server error" })
	}
}

/**
 * POST /spotify/disconnect
 * Disconnect Spotify account
 */
export const disconnect = async (req, res) => {
	try {
		const userId = req.user.sub

		await deleteSpotifyConnection(userId)

		res.json({ ok: true })
	} catch (err) {
		console.error("Error disconnecting Spotify:", err)
		res.status(500).json({ ok: false, error: "Server error" })
	}
}
