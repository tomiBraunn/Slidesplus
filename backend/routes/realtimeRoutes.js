import express from "express"

const router = express.Router()

router.get("/realtime/config", (req, res) => {
    try {
        res.json({
            ok: true,
            config: {
                url: process.env.SUPABASE_URL,
                anonKey: process.env.SUPABASE_ANON_KEY
            }
        })
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message })
    }
})

export default router