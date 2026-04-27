import express from "express";
import { generateSignature } from "../controllers/upload.controller.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Require authentication to get an upload signature
router.get("/signature", protect, generateSignature);

export default router;
