import express from "express";
import { getTrustMetrics, unblockReviewer, getSuspiciousReviews } from "../controllers/admin.controller.js";
import { protect, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();

// All admin routes require authentication + admin role
router.use(protect, authorizeRoles("admin"));

// GET /api/admin/trust-metrics — view all reviewer trust data
router.get("/trust-metrics", getTrustMetrics);

// GET /api/admin/suspicious-reviews — view AI-flagged reviews
router.get("/suspicious-reviews", getSuspiciousReviews);

// POST /api/admin/users/:userId/unblock — manually unblock a reviewer
router.post("/users/:userId/unblock", unblockReviewer);

export default router;
