import express from "express";
import { createCrowdReport } from "../controllers/crowd.controller.js";
import { protect } from "../middleware/auth.js";
import { validateCrowdReportInput } from "../middleware/validate.js";

const router = express.Router();

// POST /api/crowd
router.post("/", protect, validateCrowdReportInput, createCrowdReport);

export default router;
