import "dotenv/config"
import express from "express"
import cors from "cors"

import authRoutes from "./routes/authRoutes.js"
import userRoutes from "./routes/userRoutes.js"
import projectRoutes from "./routes/projectRoutes.js"
import geminiRoutes from "./routes/geminiRoutes.js"
import unsplashRoutes from "./routes/unsplashRoutes.js"

const app = express()
app.use(express.json())
app.use(cors({
	origin: (origin, cb) => {
		const allowed = ["http://localhost:5173", "https://slides-plus-backend.vercel.app"]
		if (!origin || allowed.includes(origin)) return cb(null, true)
		cb(new Error("Not allowed by CORS"))
	},
	credentials: true
}))

// health and debug endpoints (kept here)
app.get("/health", (_req, res) => {
	res.json({
		ok: true,
		env: {
			hasDB: !!process.env.DATABASE_URL,
			hasJWT: !!process.env.JWT_SECRET,
			hasGeminiKey: !!process.env.GEMINI_API_KEY,
			hasSupabase: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_KEY,
			hasUnsplash: !!process.env.UNSPLASH_ACCESS_KEY,
			node: process.version,
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

// mount routers
app.use("/", authRoutes)
app.use("/", userRoutes)
app.use("/", projectRoutes)
app.use("/", geminiRoutes)
app.use("/", unsplashRoutes)

const PORT = process.env.PORT || 8000
app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`)
	console.log(`Health check: http://localhost:${PORT}/health`)
	console.log(`Gemini test: http://localhost:${PORT}/gemini/test`)
	console.log(`Unsplash test: http://localhost:${PORT}/unsplash/test`)
})
