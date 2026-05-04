import Review from "../models/Review.js";
import ReviewVote from "../models/ReviewVote.js";
import { calculateTrust } from "./trust.controller.js";
import { applyTrustAndBlocking } from "../services/reviewerTrustService.js";
import { detectFakeReview } from "../services/fakeReviewDetectionService.js";


export async function createReview(req, res) {
  try {
    const { venueId, rating, reviewText, crowdLevel, images } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === "owner" || userRole === "admin") {
      return res
        .status(403)
        .json({ message: `${userRole === "owner" ? "Restaurant owners" : "Administrators"} cannot submit reviews.` });
    }
 
    if (req.user.status === "blocked") {
      return res.status(403).json({
        message:
          "Your account has been blocked due to a low trust score. You cannot submit reviews.",
      });
    }
 
    const analysis = await detectFakeReview(reviewText, { rating, venueId });

    const newReview = await Review.create({
      venueId,
      userId,
      rating,
      reviewText,
      crowdLevel,
      images: images || [],
      visitTime: new Date(), 
      mlScore: analysis.mlScore,
      isSuspicious: analysis.isSuspicious, 
      suspicionScore: analysis.suspicionScore,
      suspicionClassification: analysis.classification,
    });
 
    const allReviews = await Review.find({ venueId });
    const reviewCount = allReviews.length;
    const avgRating =
      allReviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviewCount;
 
    const Venue = (await import("../models/Venue.js")).default;
    await Venue.findByIdAndUpdate(venueId, { reviewCount, avgRating });
 
    calculateTrust(venueId).catch(console.error);
 
    applyTrustAndBlocking(userId).catch(console.error);
 
    await newReview.populate("userId", "name reviewerTrustScore status");

    return res.status(201).json(newReview);
  } catch (err) {
    console.error("Error creating review:", err);
    return res.status(500).json({ message: "Failed to create review." });
  }
}

export async function getReviewsByVenue(req, res) {
  try {
    const reviews = await Review.find({ venueId: req.params.venueId })
      .populate("userId", "name reviewerTrustScore status")
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
    const { voteType } = req.body;
    const userId = req.user.id;
 
    if (!["helpful", "suspicious"].includes(voteType)) {
      return res
        .status(400)
        .json({ message: "voteType must be 'helpful' or 'suspicious'." });
    }

    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ message: "Review not found" });
 
    if (String(review.userId) === String(userId)) {
      return res.status(403).json({
        message: "You cannot vote on your own review.",
      });
    }
 
    const existingVote = await ReviewVote.findOne({ userId, reviewId: id });

    if (existingVote) {
      if (existingVote.type === voteType) { 
        return res.status(409).json({
          message: `You have already voted '${voteType}' on this review.`,
        });
      } 
      existingVote.type = voteType;
      await existingVote.save();
    } else { 
      await ReviewVote.create({ userId, reviewId: id, type: voteType });
    }
 
    if (!review.helpfulVotes) review.helpfulVotes = [];
    if (!review.suspiciousVotes) review.suspiciousVotes = [];
 
    review.helpfulVotes.pull(userId);
    review.suspiciousVotes.pull(userId);

    if (voteType === "helpful") {
      review.helpfulVotes.push(userId);
    } else {
      review.suspiciousVotes.push(userId);
    }

    await review.save();
 
    await review.populate("userId", "name reviewerTrustScore status");
 
    await applyTrustAndBlocking(review.userId);
 
    const User = (await import("../models/User.js")).default;
    const reviewer = await User.findById(review.userId)
      .select("reviewerTrustScore status")
      .lean();

    return res.status(200).json({
      review,
      reviewer: {
        _id: reviewer?._id,
        reviewerTrustScore: reviewer?.reviewerTrustScore ?? 0,
        status: reviewer?.status ?? "active",
      },
    });
  } catch (err) {
    console.error("Error voting on review:", err);
    return res.status(500).json({ message: "Failed to vote on review." });
  }
}

