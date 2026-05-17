import "dotenv/config"
import express from "express"
import cors from "cors"
import session from "express-session"
import passport from "./config/passport.js"
import jwt from "jsonwebtoken"
import authRoutes from "./routes/authRoutes.js"
import userRoutes from "./routes/userRoutes.js"
import projectRoutes from "./routes/projectRoutes.js"
import geminiRoutes from "./routes/geminiRoutes.js"
// ChatGPT routes currently disabled per request (Option A).
// import chatgptRoutes from "./routes/chatgptRoutes.js"
import unsplashRoutes from "./routes/unsplashRoutes.js"
import realtimeRoutes from "./routes/realtimeRoutes.js"
import collaborationRoutes from "./routes/collaborationRoutes.js"
import versionRoutes from "./routes/versionRoutes.js"
import spotifyRoutes from "./routes/spotifyRoutes.js"

const app = express()

const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production" || process.env.VERCEL

const frontendURL = isProduction
	? "https://slidesplus.vercel.app"
	: (process.env.FRONTEND_URL || "http://localhost:5173")

app.use(cors({
	origin: ["http://localhost:5173", "https://slidesplus.vercel.app", "https://slides-plus.vercel.app"],
	credentials: true,
	methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"]
}))

app.use(express.json())

app.use(
	session({
		secret: process.env.SESSION_SECRET || "slides-plus-oauth-secret",
		resave: false,
		saveUninitialized: false,
		cookie: {
			secure: process.env.NODE_ENV === "production",
			maxAge: 24 * 60 * 60 * 1000,
		},
	})
)

app.use(passport.initialize())
app.use(passport.session())

app.get("/health", (_req, res) => {
	res.json({
		ok: true,
		env: {
			hasDB: !!process.env.DATABASE_URL,
			hasJWT: !!process.env.JWT_SECRET,
			hasGeminiKey: !!process.env.GEMINI_API_KEY,
			hasOpenAIKey: !!process.env.OPENAI_API_KEY,
			hasSupabase: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_KEY,
			hasUnsplash: !!process.env.UNSPLASH_ACCESS_KEY,
			hasSupabaseAnon: !!process.env.SUPABASE_ANON_KEY,
			node: process.version,
			isProduction: isProduction,
			vercelEnv: process.env.VERCEL_ENV,
			vercel: !!process.env.VERCEL,
			nodeEnv: process.env.NODE_ENV,
			githubCallback: isProduction ? "https://slides-plus-backend.vercel.app/auth/github/callback" : (process.env.GITHUB_CALLBACK_URL || "http://localhost:8000/auth/github/callback"),
			googleCallback: isProduction ? "https://slides-plus-backend.vercel.app/auth/google/callback" : (process.env.GOOGLE_CALLBACK_URL || "http://localhost:8000/auth/google/callback"),
			frontendUrl: frontendURL,
		},
	})
})

app.get("/debug/routes", (_req, res) => {
	const routes = []
	app._router?.stack?.forEach((l) => {
		if (l.route?.path) {
			const methods = Object.keys(l.route.methods)
				.filter((m) => l.route.methods[m])
				.map((m) => m.toUpperCase())
				.join(",")
			routes.push(`${methods} ${l.route.path}`)
		}
	})
	res.json({ routes })
})

app.use("/", authRoutes)
app.use("/", userRoutes)
app.use("/", projectRoutes)
app.use("/", geminiRoutes)
// app.use("/", chatgptRoutes)
app.use("/", unsplashRoutes)
app.use("/", realtimeRoutes)
app.use("/", collaborationRoutes)
app.use("/", versionRoutes)
app.use("/spotify", spotifyRoutes)

app.get("/auth/github", passport.authenticate("github", { scope: ["user:email"] }))

app.get(
	"/auth/github/callback",
	passport.authenticate("github", {
		failureRedirect: `${frontendURL}/login?error=github`,
	}),
	(req, res) => {
		try {
			console.log("[GitHub Callback] User authenticated:", { id: req.user?.id, email: req.user?.email })

			if (!req.user) {
				console.error("[GitHub Callback] No user in request")
				return res.redirect(`${frontendURL}/login?error=no_user`)
			}

			const token = jwt.sign({ sub: req.user.id, email: req.user.email }, process.env.JWT_SECRET, {
				expiresIn: "7d",
			})

			console.log("[GitHub Callback] JWT created, redirecting to frontend")
			res.redirect(`${frontendURL}/auth/callback?token=${token}`)
		} catch (err) {
			console.error("[GitHub Callback] Error:", err)
			res.redirect(`${frontendURL}/login?error=callback_error`)
		}
	}
)

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }))

app.get(
	"/auth/google/callback",
	passport.authenticate("google", {
		failureRedirect: `${frontendURL}/login?error=google`,
	}),
	(req, res) => {
		const token = jwt.sign({ sub: req.user.id, email: req.user.email }, process.env.JWT_SECRET, {
			expiresIn: "7d",
		})
		res.redirect(`${frontendURL}/auth/callback?token=${token}`)
	}
)

const PORT = process.env.PORT || 8000
app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`)
	console.log(`Health check: http://localhost:${PORT}/health`)
	console.log(`Gemini test: http://localhost:${PORT}/gemini/test`)
	console.log(`Unsplash test: http://localhost:${PORT}/unsplash/test`)
})
