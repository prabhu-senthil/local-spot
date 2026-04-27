import express from "express";
import { getVenueAnalytics } from "../controllers/analyticscontroller.js";

const router = express.Router();

// GET /api/analytics/:venueId
router.get("/:venueId", getVenueAnalytics);

export default router;

