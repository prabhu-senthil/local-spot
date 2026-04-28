import express from "express";
import {
  getVenues,
  getVenueById,
  claimVenue,
  resendClaimOTP,
  verifyClaimOTP,
  updateVenueImage,
} from "../controllers/venues.controller.js";
import { protect, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();

router.get("/", getVenues);
router.get("/:id", getVenueById);
router.post("/:id/claim", protect, authorizeRoles("owner"), claimVenue);
router.post("/:id/claim/resend", protect, authorizeRoles("owner"), resendClaimOTP);
router.post("/:id/claim/verify", protect, authorizeRoles("owner"), verifyClaimOTP);
router.put("/:id/image", protect, authorizeRoles("owner"), updateVenueImage);

export default router;

