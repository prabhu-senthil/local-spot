import express from "express";
import { getNotificationsByUser, markNotificationRead } from "../controllers/notifications.controller.js";

const router = express.Router();

 
router.get("/:userId", getNotificationsByUser);

router.patch("/:id/read", markNotificationRead);

export default router;

