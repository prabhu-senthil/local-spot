import express from "express";
import { createReview, getReviewsByVenue, voteOnReview } from "../controllers/reviews.controller.js";
import { protect } from "../middleware/auth.js";
import { validateReviewInput } from "../middleware/validate.js";
import { blockReviewers } from "../middleware/blockCheck.js";

const router = express.Router();
 
router.post("/", protect, blockReviewers, validateReviewInput, createReview);
 
router.get("/:venueId", getReviewsByVenue);

router.post("/:id/vote", protect, voteOnReview);

export default router;
