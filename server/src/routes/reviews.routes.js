import express from "express";
import { createReview, getReviewsByVenue, voteOnReview } from "../controllers/reviews.controller.js";
import { protect } from "../middleware/auth.js";
import { validateReviewInput } from "../middleware/validate.js";

const router = express.Router();

// POST /api/reviews
router.post("/", protect, validateReviewInput, createReview);

// GET /api/reviews/:venueId
router.get("/:venueId", getReviewsByVenue);

// POST /api/reviews/:id/vote
router.post("/:id/vote", protect, voteOnReview);

export default router;
