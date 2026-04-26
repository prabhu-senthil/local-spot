import Review from "../models/Review.js";
import { calculateTrust } from "./trust.controller.js";

export async function createReview(req, res) {
  try {
    const { venueId, rating, reviewText, crowdLevel, images } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === "owner") {
      return res.status(403).json({ message: "Restaurant owners cannot submit reviews." });
    }

    const newReview = await Review.create({
      venueId,
      userId,
      rating,
      reviewText,
      crowdLevel,
      images: images || [],
      visitTime: new Date(),
    });

    // Recalculate review count and average rating
    const allReviews = await Review.find({ venueId });
    const reviewCount = allReviews.length;
    const avgRating = allReviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviewCount;

    // Update the Venue document with the new stats
    const Venue = (await import("../models/Venue.js")).default;
    await Venue.findByIdAndUpdate(venueId, {
      reviewCount,
      avgRating
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

export async function voteOnReview(req, res) {
  try {
    const { id } = req.params;
    const { voteType } = req.body; // 'upvote', 'downvote', or 'none'
    const userId = req.user.id;

    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    // Remove user from both arrays first
    review.upvotes = review.upvotes.filter(uid => uid.toString() !== userId.toString());
    review.downvotes = review.downvotes.filter(uid => uid.toString() !== userId.toString());

    if (voteType === 'upvote') {
      review.upvotes.push(userId);
    } else if (voteType === 'downvote') {
      review.downvotes.push(userId);
    }

    await review.save();

    // Recalculate reviewer's trust score
    const User = (await import("../models/User.js")).default;
    const reviewAuthor = await User.findById(review.userId);
    
    if (reviewAuthor && reviewAuthor.role === 'reviewer') {
      // Find all reviews by this reviewer
      const authorReviews = await Review.find({ userId: reviewAuthor._id });
      let trustScore = 0;
      authorReviews.forEach(r => {
        trustScore += (r.upvotes.length - r.downvotes.length);
      });
      
      reviewAuthor.reviewerTrustScore = trustScore;
      await reviewAuthor.save();
    }

    return res.status(200).json(review);
  } catch (err) {
    console.error("Error voting on review:", err);
    return res.status(500).json({ message: "Failed to vote on review." });
  }
}
