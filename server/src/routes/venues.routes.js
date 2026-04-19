import express from "express";
import { getVenues, getVenueById, claimVenue } from "../controllers/venues.controller.js";
import { protect, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();

router.get("/", getVenues);
router.get("/:id", getVenueById);
router.post("/:id/claim", protect, authorizeRoles("restaurant_owner"), claimVenue);

export default router;

