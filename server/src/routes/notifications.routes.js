import express from "express";
import { getNotificationsByUser, markNotificationRead } from "../controllers/notifications.controller.js";

const router = express.Router();

// GET /api/notifications/:userId
router.get("/:userId", getNotificationsByUser);

// PATCH /api/notifications/:id/read
router.patch("/:id/read", markNotificationRead);

export default router;

