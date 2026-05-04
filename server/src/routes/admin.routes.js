import express from "express";
import { 
  getTrustMetrics, unblockReviewer, getSuspiciousReviews,
  getAllUsers, updateUserStatus, updateUserRole, resetUserPassword,
  getAllReviews, deleteReview, overrideReview,
  getAllCrowdReports, deleteCrowdReport, resetVenueCrowdData,
  getAllAdminVenues, updateVenueApproval, updateVenueDetails, deleteVenue, mergeVenues,
  updateUserTrustScore, getPlatformStats
} from "../controllers/admin.controller.js";
import { protect, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();
 
router.use(protect, authorizeRoles("admin"));

 
router.get("/stats", getPlatformStats);

 
router.get("/users", getAllUsers);
router.patch("/users/:userId/status", updateUserStatus);
router.patch("/users/:userId/role", updateUserRole);
router.patch("/users/:userId/trust-score", updateUserTrustScore);
router.post("/users/:userId/reset-password", resetUserPassword);
 
router.get("/reviews", getAllReviews);
router.delete("/reviews/:reviewId", deleteReview);
router.patch("/reviews/:reviewId/override", overrideReview);

 
router.get("/crowd-reports", getAllCrowdReports);
router.delete("/crowd-reports/:reportId", deleteCrowdReport);
router.post("/venues/:venueId/crowd-reset", resetVenueCrowdData);
 
router.get("/venues", getAllAdminVenues);
router.patch("/venues/:venueId/approval", updateVenueApproval);
router.patch("/venues/:venueId/details", updateVenueDetails);
router.delete("/venues/:venueId", deleteVenue);
router.post("/venues/merge", mergeVenues);
 
router.get("/trust-metrics", getTrustMetrics);
router.get("/suspicious-reviews", getSuspiciousReviews);
router.post("/users/:userId/unblock", unblockReviewer);

export default router;
