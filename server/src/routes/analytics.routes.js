import express from "express";
import { getVenueAnalytics, getOwnerDashboard } from "../controllers/analyticscontroller.js";
import { protect, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();
 
router.get("/dashboard", protect, authorizeRoles("admin", "owner"), getOwnerDashboard);

router.get("/:venueId", getVenueAnalytics);

export default router;

