import express from "express";
import { createReview, getReviewsByVenue } from "../controllers/reviews.controller.js";

const router = express.Router();

// POST /api/reviews
router.post("/", createReview);

// GET /api/reviews/:venueId
router.get("/:venueId", getReviewsByVenue);

export default router;

