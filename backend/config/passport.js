import passport from "passport"
import { Strategy as GitHubStrategy } from "passport-github2"
import { Strategy as GoogleStrategy } from "passport-google-oauth20"
import { pool } from "./database.js"

const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production" || process.env.VERCEL

const githubCallbackURL = isProduction
	? "https://slides-plus-backend.vercel.app/auth/github/callback"
	: (process.env.GITHUB_CALLBACK_URL || "http://localhost:8000/auth/github/callback")

const googleCallbackURL = isProduction
	? "https://slides-plus-backend.vercel.app/auth/google/callback"
	: (process.env.GOOGLE_CALLBACK_URL || "http://localhost:8000/auth/google/callback")

passport.use(
	new GitHubStrategy(
		{
			clientID: process.env.GITHUB_CLIENT_ID || "Ov23li9E8M3ty2y1Ab6A",
			clientSecret: process.env.GITHUB_CLIENT_SECRET || "***REMOVED_GITHUB_CLIENT_SECRET***",
			callbackURL: githubCallbackURL,
		},
		async (accessToken, refreshToken, profile, done) => {
			try {
				console.log("[GitHub OAuth] Profile received:", { id: profile.id, username: profile.username, email: profile.emails?.[0]?.value })

				const existingUser = await pool.query("SELECT * FROM users WHERE github_id = $1", [profile.id])
				console.log("[GitHub OAuth] Existing user check:", existingUser.rows.length > 0 ? "Found" : "Not found")

				if (existingUser.rows.length > 0) {
					console.log("[GitHub OAuth] Returning existing user:", existingUser.rows[0].id)
					return done(null, existingUser.rows[0])
				}

				console.log("[GitHub OAuth] Creating new user with data:", {
					username: profile.username || profile.displayName,
					email: profile.emails?.[0]?.value || null,
					github_id: profile.id
				})

				const newUser = await pool.query(
					`INSERT INTO users (username, email, first_name, last_name, avatar, github_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           RETURNING *`,
					[
						profile.username || profile.displayName,
						profile.emails?.[0]?.value || null,
						profile.displayName?.split(" ")[0] || "",
						profile.displayName?.split(" ").slice(1).join(" ") || "",
						profile.photos?.[0]?.value || null,
						profile.id,
					]
				)

				console.log("[GitHub OAuth] New user created:", newUser.rows[0].id)
				return done(null, newUser.rows[0])
			} catch (err) {
				console.error("[GitHub OAuth] Error:", err)
				return done(err, null)
			}
		}
	)
)

passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID || "393566142603-87vnrlpb45asglhngrh15ks5phpb9ssl.apps.googleusercontent.com",
			clientSecret: process.env.GOOGLE_CLIENT_SECRET || "***REMOVED_GOOGLE_CLIENT_SECRET***",
			callbackURL: googleCallbackURL,
		},
		async (accessToken, refreshToken, profile, done) => {
			try {
				const existingUser = await pool.query("SELECT * FROM users WHERE google_id = $1", [profile.id])

				if (existingUser.rows.length > 0) {
					return done(null, existingUser.rows[0])
				}

				const newUser = await pool.query(
					`INSERT INTO users (username, email, first_name, last_name, avatar, google_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           RETURNING *`,
					[
						profile.emails?.[0]?.value.split("@")[0] || profile.displayName,
						profile.emails?.[0]?.value || null,
						profile.name?.givenName || "",
						profile.name?.familyName || "",
						profile.photos?.[0]?.value || null,
						profile.id,
					]
				)

				return done(null, newUser.rows[0])
			} catch (err) {
				return done(err, null)
			}
		}
	)
)

passport.serializeUser((user, done) => done(null, user.id))

passport.deserializeUser(async (id, done) => {
	try {
		const result = await pool.query("SELECT * FROM users WHERE id = $1", [id])
		done(null, result.rows[0])
	} catch (err) {
		done(err, null)
	}
})

export default passport
