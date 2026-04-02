import express from "express";
import { getVenues, getVenueById } from "../controllers/venues.controller.js";

const router = express.Router();

router.get("/", getVenues);
router.get("/:id", getVenueById);

export default router;

