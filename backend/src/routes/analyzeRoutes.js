import express from "express";
import multer from "multer";
import { analyzeCandidate, getUserSuggestion } from "../controllers/analyzeController.js";
import { createCoverLetter, getUserCoverLetter } from "../controllers/coverLetterController.js";
import { apiLimiter } from "../middleware/rateLimiter.js";
import { protectRoute } from "../middleware/authMiddleware.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.use(apiLimiter);

router.post("/analyze", upload.single("resume"), protectRoute, analyzeCandidate);
router.post("/cover-letter", upload.single('resume'), protectRoute, createCoverLetter);

router.get("/suggestion", protectRoute, getUserSuggestion);
router.get("/cover-letter", protectRoute, getUserCoverLetter);

export default router;
