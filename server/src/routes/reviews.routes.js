import express from "express";
import { createReview, getReviewsByVenue } from "../controllers/reviews.controller.js";
import { protect } from "../middleware/auth.js";
import { validateReviewInput } from "../middleware/validate.js";

const router = express.Router();

// POST /api/reviews
router.post("/", protect, validateReviewInput, createReview);

// GET /api/reviews/:venueId
router.get("/:venueId", getReviewsByVenue);

export default router;
