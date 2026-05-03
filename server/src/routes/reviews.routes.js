import express from "express";
import { createReview, getReviewsByVenue, voteOnReview } from "../controllers/reviews.controller.js";
import { protect } from "../middleware/auth.js";
import { validateReviewInput } from "../middleware/validate.js";
import { blockReviewers } from "../middleware/blockCheck.js";

const router = express.Router();

// POST /api/reviews — blocked users are rejected before reaching the controller
router.post("/", protect, blockReviewers, validateReviewInput, createReview);

// GET /api/reviews/:venueId
router.get("/:venueId", getReviewsByVenue);

// POST /api/reviews/:id/vote
router.post("/:id/vote", protect, voteOnReview);

export default router;
