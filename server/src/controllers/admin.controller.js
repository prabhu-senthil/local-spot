import User from "../models/User.js";
import Review from "../models/Review.js";
import Venue from "../models/Venue.js";
import CrowdReport from "../models/CrowdReport.js";
import CrowdAnalytics from "../models/CrowdAnalytics.js";
import bcrypt from "bcryptjs";
 
export async function getAllUsers(req, res) {
  try {
    const { role, status } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;

    const users = await User.find(filter, "-passwordHash")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    return res.status(500).json({ message: "Failed to fetch users." });
  }
}


export async function updateUserStatus(req, res) {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!["active", "blocked"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const updateData = { status };
    if (status === "blocked") {
      updateData.reviewerTrustScore = 0;
    } else if (status === "active") {
      updateData.reviewerTrustScore = 0; // Reset score when unblocking
    }

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found." });

    if (status === "active") {
      // Find all suspicious reviews by this user to get affected venues
      const suspiciousReviews = await Review.find({ 
        userId: user._id, 
        isSuspicious: true 
      }).select("venueId");
      
      const affectedVenueIds = [...new Set(suspiciousReviews.map(r => r.venueId.toString()))];

      // Delete those suspicious reviews
      await Review.deleteMany({ 
        userId: user._id, 
        isSuspicious: true 
      });

      // Recalculate Venue Ratings and Review Counts
      for (const venueId of affectedVenueIds) {
        const remainingReviews = await Review.find({ venueId });
        
        const newReviewCount = remainingReviews.length;
        const newAvgRating = newReviewCount > 0 
          ? remainingReviews.reduce((sum, r) => sum + r.rating, 0) / newReviewCount 
          : 0;

        await Venue.findByIdAndUpdate(venueId, {
          reviewCount: newReviewCount,
          avgRating: newAvgRating
        });
      }
    }

    return res.status(200).json({ message: `User status updated to ${status}.`, user });
  } catch (err) {
    console.error("Error updating user status:", err);
    return res.status(500).json({ message: "Failed to update user status." });
  }
}


export async function updateUserRole(req, res) {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!["user", "reviewer", "owner", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true }).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found." });

    return res.status(200).json({ message: `User role updated to ${role}.`, user });
  } catch (err) {
    console.error("Error updating user role:", err);
    return res.status(500).json({ message: "Failed to update user role." });
  }
}

export async function resetUserPassword(req, res) {
  try {
    const { userId } = req.params;
    const tempPassword = "Password123!";
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await User.findByIdAndUpdate(userId, { passwordHash }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found." });

    return res.status(200).json({ 
      message: `Password reset successfully for ${user.email}. Temporary password: ${tempPassword}` 
    });
  } catch (err) {
    console.error("Error resetting password:", err);
    return res.status(500).json({ message: "Failed to reset password." });
  }
}

export async function getTrustMetrics(req, res) {
  try {
    const users = await User.find(
      { role: { $in: ["user", "reviewer"] } },
      "name email role reviewerTrustScore status reviewsCount createdAt"
    )
      .sort({ reviewerTrustScore: 1 })
      .lean();
     
    const enriched = await Promise.all(
      users.map(async (u) => {
        const reviews = await Review.find({ userId: u._id }).lean();
        const helpfulCount = reviews.reduce(
          (sum, r) => sum + (r.helpfulVotes?.length || 0),
          0
        );
        const suspiciousCount = reviews.reduce(
          (sum, r) => sum + (r.suspiciousVotes?.length || 0),
          0
        );
        const flaggedReviews = reviews.filter((r) => r.isSuspicious).length;

        return {
          ...u,
          reviewCount: reviews.length,
          helpfulVotes: helpfulCount,
          suspiciousVotes: suspiciousCount,
          flaggedReviews,
        };
      })
    );

    const blocked = enriched.filter((u) => u.status === "blocked");
    const active = enriched.filter((u) => u.status !== "blocked");

    return res.status(200).json({
      summary: {
        total: enriched.length,
        blocked: blocked.length,
        active: active.length,
      },
      blockedUsers: blocked,
      activeUsers: active,
    });
  } catch (err) {
    console.error("Error fetching trust metrics:", err);
    return res.status(500).json({ message: "Failed to fetch trust metrics." });
  }
}


export async function unblockReviewer(req, res) {
  try {
    const { userId } = req.params;
    const user = await User.findByIdAndUpdate(
      userId,
      { status: "active", reviewerTrustScore: 0 },
      { new: true }
    ).select("name email status reviewerTrustScore");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Step 1: Find all suspicious reviews by this user to get affected venues
    const suspiciousReviews = await Review.find({ 
      userId: user._id, 
      isSuspicious: true 
    }).select("venueId");
    
    const affectedVenueIds = [...new Set(suspiciousReviews.map(r => r.venueId.toString()))];

    // Step 2: Delete those suspicious reviews
    await Review.deleteMany({ 
      userId: user._id, 
      isSuspicious: true 
    });

    // Step 3: Recalculate Venue Ratings and Review Counts
    for (const venueId of affectedVenueIds) {
      const remainingReviews = await Review.find({ venueId });
      
      const newReviewCount = remainingReviews.length;
      const newAvgRating = newReviewCount > 0 
        ? remainingReviews.reduce((sum, r) => sum + r.rating, 0) / newReviewCount 
        : 0;

      await Venue.findByIdAndUpdate(venueId, {
        reviewCount: newReviewCount,
        avgRating: newAvgRating
      });
    }

    return res.status(200).json({
      message: `Reviewer ${user.name} has been unblocked and trust score reset to 0.`,
      user,
    });
  } catch (err) {
    console.error("Error unblocking reviewer:", err);
    return res.status(500).json({ message: "Failed to unblock reviewer." });
  }
}
 
export async function getSuspiciousReviews(req, res) {
  try {
    const { classification, limit = 50 } = req.query;

    const filter = { isSuspicious: true };
    if (classification && ["suspicious", "highly_suspicious"].includes(classification)) {
      filter.suspicionClassification = classification;
    }

    const reviews = await Review.find(filter)
      .populate("userId", "name email status reviewerTrustScore")
      .populate("venueId", "name")
      .sort({ suspicionScore: -1, createdAt: -1 })
      .limit(Number(limit))
      .lean();

    const summary = {
      total: reviews.length,
      highlySuspicious: reviews.filter((r) => r.suspicionClassification === "highly_suspicious").length,
      suspicious: reviews.filter((r) => r.suspicionClassification === "suspicious").length,
    };

    return res.status(200).json({ summary, reviews });
  } catch (err) {
    console.error("Error fetching suspicious reviews:", err);
    return res.status(500).json({ message: "Failed to fetch suspicious reviews." });
  }
}

export async function getAllReviews(req, res) {
  try {
    const { limit = 50, skip = 0 } = req.query;
    const reviews = await Review.find()
      .populate("userId", "name email")
      .populate("venueId", "name")
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .lean();

    const total = await Review.countDocuments();

    return res.status(200).json({ reviews, total });
  } catch (err) {
    console.error("Error fetching reviews:", err);
    return res.status(500).json({ message: "Failed to fetch reviews." });
  }
}

export async function deleteReview(req, res) {
  try {
    const { reviewId } = req.params;
    const review = await Review.findByIdAndDelete(reviewId);
    if (!review) return res.status(404).json({ message: "Review not found." });

    return res.status(200).json({ message: "Review deleted successfully." });
  } catch (err) {
    console.error("Error deleting review:", err);
    return res.status(500).json({ message: "Failed to delete review." });
  }
}

export async function overrideReview(req, res) {
  try {
    const { reviewId } = req.params;
    const review = await Review.findByIdAndUpdate(
      reviewId,
      {
        isSuspicious: false,
        suspicionClassification: "genuine",
        suspicionScore: 0,
        mlScore: 0
      },
      { new: true }
    );
    if (!review) return res.status(404).json({ message: "Review not found." });

    return res.status(200).json({ message: "Review marked as genuine.", review });
  } catch (err) {
    console.error("Error overriding review:", err);
    return res.status(500).json({ message: "Failed to override review." });
  }
}
 
export async function getAllCrowdReports(req, res) {
  try {
    const { limit = 50 } = req.query;
    const reports = await CrowdReport.find()
      .populate("userId", "name email")
      .populate("venueId", "name")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    return res.status(200).json(reports);
  } catch (err) {
    console.error("Error fetching crowd reports:", err);
    return res.status(500).json({ message: "Failed to fetch crowd reports." });
  }
}
 
export async function deleteCrowdReport(req, res) {
  try {
    const { reportId } = req.params;
    const report = await CrowdReport.findByIdAndDelete(reportId);
    if (!report) return res.status(404).json({ message: "Report not found." });

    return res.status(200).json({ message: "Crowd report deleted successfully." });
  } catch (err) {
    console.error("Error deleting crowd report:", err);
    return res.status(500).json({ message: "Failed to delete crowd report." });
  }
}
 
export async function resetVenueCrowdData(req, res) {
  try {
    const { venueId } = req.params;

    await Promise.all([
      CrowdReport.deleteMany({ venueId }),
      CrowdAnalytics.deleteMany({ venueId })
    ]);

    return res.status(200).json({ message: "Venue crowd data has been completely reset." });
  } catch (err) {
    console.error("Error resetting venue crowd data:", err);
    return res.status(500).json({ message: "Failed to reset venue crowd data." });
  }
}

export async function getAllAdminVenues(req, res) {
  try {
    const { sort = "-createdAt" } = req.query;
    
    if (sort === "ownerName" || sort === "-ownerName") {
      const order = sort.startsWith("-") ? -1 : 1;
      const venues = await Venue.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "ownerId",
            foreignField: "_id",
            as: "owner"
          }
        },
        {
          $unwind: {
            path: "$owner",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $addFields: {
            ownerName: { $ifNull: ["$owner.name", "ZZZZZ"] } // Put unclaimed at the end
          }
        },
        { $sort: { ownerName: order } }
      ]);
      
      const formatted = venues.map(v => ({
        ...v,
        ownerId: v.owner ? { _id: v.owner._id, name: v.owner.name, email: v.owner.email } : null
      }));

      return res.status(200).json(formatted);
    }

    const venues = await Venue.find({})
      .populate("ownerId", "name email")
      .sort(sort)
      .lean();

    return res.status(200).json(venues);
  } catch (err) {
    console.error("Error fetching admin venues:", err);
    return res.status(500).json({ message: "Failed to fetch venues." });
  }
}
 
export async function updateVenueApproval(req, res) {
  try {
    const { venueId } = req.params;
    const { approvalStatus } = req.body;

    if (!["approved", "rejected", "pending"].includes(approvalStatus)) {
      return res.status(400).json({ message: "Invalid approval status." });
    }

    const venue = await Venue.findByIdAndUpdate(venueId, { approvalStatus }, { new: true });
    if (!venue) return res.status(404).json({ message: "Venue not found." });

    return res.status(200).json({ message: `Venue ${approvalStatus} successfully.`, venue });
  } catch (err) {
    console.error("Error updating venue approval:", err);
    return res.status(500).json({ message: "Failed to update venue approval." });
  }
}
 
export async function updateVenueDetails(req, res) {
  try {
    const { venueId } = req.params;
    const updates = req.body;

    const venue = await Venue.findByIdAndUpdate(venueId, updates, { new: true });
    if (!venue) return res.status(404).json({ message: "Venue not found." });

    return res.status(200).json({ message: "Venue details updated.", venue });
  } catch (err) {
    console.error("Error updating venue details:", err);
    return res.status(500).json({ message: "Failed to update venue details." });
  }
}
 
export async function deleteVenue(req, res) {
  try {
    const { venueId } = req.params;
    const venue = await Venue.findByIdAndDelete(venueId);
    if (!venue) return res.status(404).json({ message: "Venue not found." });

    await Promise.all([
      Review.deleteMany({ venueId }),
      CrowdReport.deleteMany({ venueId }),
      CrowdAnalytics.deleteMany({ venueId })
    ]);

    return res.status(200).json({ message: "Venue and all associated data deleted." });
  } catch (err) {
    console.error("Error deleting venue:", err);
    return res.status(500).json({ message: "Failed to delete venue." });
  }
}

export async function mergeVenues(req, res) {
  try {
    const { sourceId, targetId } = req.body;
    if (!sourceId || !targetId) return res.status(400).json({ message: "Source and Target IDs required." });

    const [source, target] = await Promise.all([
      Venue.findById(sourceId),
      Venue.findById(targetId)
    ]);

    if (!source || !target) return res.status(404).json({ message: "One or both venues not found." });
 
    await Promise.all([
      Review.updateMany({ venueId: sourceId }, { venueId: targetId }),
      CrowdReport.updateMany({ venueId: sourceId }, { venueId: targetId }),
      CrowdAnalytics.deleteMany({ venueId: sourceId }) // Target will have its own analytics
    ]);
 
    const reviews = await Review.find({ venueId: targetId });
    target.reviewCount = reviews.length;
    target.avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;
    await target.save();
 
    await Venue.findByIdAndDelete(sourceId);

    return res.status(200).json({ message: "Venues merged successfully.", target });
  } catch (err) {
    console.error("Merge error:", err);
    return res.status(500).json({ message: "Failed to merge venues." });
  }
}
 
export async function updateUserTrustScore(req, res) {
  try {
    const { userId } = req.params;
    const { score } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { reviewerTrustScore: Number(score) },
      { new: true }
    ).select("name email reviewerTrustScore");

    if (!user) return res.status(404).json({ message: "User not found." });

    return res.status(200).json({ message: "Trust score adjusted.", user });
  } catch (err) {
    console.error("Error adjusting trust score:", err);
    return res.status(500).json({ message: "Failed to adjust trust score." });
  }
}
 
export async function getPlatformStats(req, res) {
  try {
    const [totalUsers, totalReviews, totalVenues] = await Promise.all([
      User.countDocuments(),
      Review.countDocuments(),
      Venue.countDocuments()
    ]);
 
    const reviewStats = await Review.aggregate([
      {
        $group: {
          _id: "$suspicionClassification",
          count: { $sum: 1 }
        }
      }
    ]);
 
    const topVenues = await Venue.find()
      .sort({ reviewCount: -1 })
      .limit(5)
      .select("name reviewCount avgRating")
      .lean();
 
    const crowdTrends = await CrowdAnalytics.aggregate([
      {
        $group: {
          _id: "$hour",
          avgBusy: { $avg: "$busyCount" },
          avgQuiet: { $avg: "$quietCount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return res.status(200).json({
      overview: {
        totalUsers,
        totalReviews,
        totalVenues
      },
      reviewStats,
      topVenues,
      crowdTrends
    });
  } catch (err) {
    console.error("Error fetching platform stats:", err);
    return res.status(500).json({ message: "Failed to fetch platform stats." });
  }
}
