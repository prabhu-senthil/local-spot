// models/Notification.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    type: {
      type: String,
      enum: ["review", "promotion", "system"],
    },

    title: String,
    message: String,

    relatedVenueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
    },

    relatedReviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1 });

export default mongoose.model("Notification", notificationSchema);