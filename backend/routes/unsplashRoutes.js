import express from "express"
import { searchUnsplash, testUnsplash } from "../controllers/unsplashController.js"

const router = express.Router()
router.get("/unsplash/search", searchUnsplash)
router.get("/unsplash/test", testUnsplash)
export default router
