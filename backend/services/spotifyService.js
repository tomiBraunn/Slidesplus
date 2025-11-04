import { pool } from "../config/database.js"

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "14468f5ae0a94b568c669c6407347993"
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "***REMOVED_SPOTIFY_CLIENT_SECRET***"
const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production" || process.env.VERCEL

const SPOTIFY_REDIRECT_URI = isProduction
	? "https://slides-plus-backend.vercel.app/spotify/callback"
	: (process.env.SPOTIFY_REDIRECT_URI || "http://localhost:8000/spotify/callback")

/**
 * Get a valid access token for a user (refreshes if expired)
 */
export async function getValidAccessToken(userId) {
	const result = await pool.query(
		"SELECT access_token, refresh_token, expires_at FROM spotify_connections WHERE user_id = $1",
		[userId]
	)

	if (result.rowCount === 0) {
		return null
	}

	const connection = result.rows[0]

	// If token hasn't expired, return it
	if (new Date(connection.expires_at) > new Date()) {
		return connection.access_token
	}

	// Token expired, refresh it
	try {
		const response = await fetch("https://accounts.spotify.com/api/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64"),
			},
			body: new URLSearchParams({
				grant_type: "refresh_token",
				refresh_token: connection.refresh_token,
			}),
		})

		if (!response.ok) {
			console.error("Failed to refresh Spotify token:", await response.text())
			return null
		}

		const data = await response.json()

		// Save new access token
		const expiresAt = new Date(Date.now() + data.expires_in * 1000)
		await pool.query(
			"UPDATE spotify_connections SET access_token = $1, expires_at = $2, updated_at = NOW() WHERE user_id = $3",
			[data.access_token, expiresAt, userId]
		)

		return data.access_token
	} catch (err) {
		console.error("Error refreshing Spotify token:", err)
		return null
	}
}

/**
 * Exchange authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(code) {
	const response = await fetch("https://accounts.spotify.com/api/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64"),
		},
		body: new URLSearchParams({
			grant_type: "authorization_code",
			code: code,
			redirect_uri: SPOTIFY_REDIRECT_URI,
		}),
	})

	if (!response.ok) {
		throw new Error("Failed to exchange code for tokens")
	}

	return await response.json()
}

/**
 * Save Spotify connection for a user
 */
export async function saveSpotifyConnection(userId, accessToken, refreshToken, expiresIn) {
	const expiresAt = new Date(Date.now() + expiresIn * 1000)

	await pool.query(
		`INSERT INTO spotify_connections (user_id, access_token, refresh_token, expires_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       access_token = $2,
       refresh_token = $3,
       expires_at = $4,
       updated_at = NOW()`,
		[userId, accessToken, refreshToken, expiresAt]
	)
}

/**
 * Check if user has Spotify connected
 */
export async function isSpotifyConnected(userId) {
	const result = await pool.query("SELECT 1 FROM spotify_connections WHERE user_id = $1", [userId])
	return result.rowCount > 0
}

/**
 * Delete Spotify connection for a user
 */
export async function deleteSpotifyConnection(userId) {
	await pool.query("DELETE FROM spotify_connections WHERE user_id = $1", [userId])
}

/**
 * Call Spotify API with automatic token handling
 */
export async function callSpotifyAPI(userId, endpoint, options = {}) {
	const accessToken = await getValidAccessToken(userId)

	if (!accessToken) {
		throw new Error("No valid Spotify access token")
	}

	const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
		...options,
		headers: {
			...options.headers,
			Authorization: `Bearer ${accessToken}`,
		},
	})

	return response
}
