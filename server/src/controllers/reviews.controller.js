import Review from "../models/Review.js";
import { calculateTrust } from "./trust.controller.js";

export async function createReview(req, res) {
  try {
    const { venueId, rating, reviewText, crowdLevel } = req.body;
    const userId = req.user.id;

    const newReview = await Review.create({
      venueId,
      userId,
      rating,
      reviewText,
      crowdLevel,
      visitTime: new Date(),
    });

    // Recalculate trust score for the venue asynchronously
    calculateTrust(venueId).catch(console.error);

    return res.status(201).json(newReview);
  } catch (err) {
    console.error("Error creating review:", err);
    return res.status(500).json({ message: "Failed to create review." });
  }
}

export async function getReviewsByVenue(req, res) {
  try {
    const reviews = await Review.find({ venueId: req.params.venueId })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json(reviews);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch reviews." });
  }
}
