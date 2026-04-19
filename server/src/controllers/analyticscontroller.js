import Venue from "../models/Venue.js";
import CrowdAnalytics from "../models/CrowdAnalytics.js";

export async function getOwnerDashboard(req, res) {
  try {
    const isOwner = req.user.role === "restaurant_owner";
    const isAdmin = req.user.role === "admin";
    const ownerId = req.user.id;

    // 1. Fetch venues
    let query = {};
    if (isOwner) {
      query = { ownerId };
    } else if (!isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const venues = await Venue.find(query).lean();
    if (!venues || venues.length === 0) {
      return res.status(200).json({
        overview: { totalVenues: 0, globalAvgRating: 0, totalReviews: 0 },
        topVenues: [],
        crowdTrends: [],
      });
    }

    const venueIds = venues.map((v) => v._id);

    // 2. Overview Stats
    const totalVenues = venues.length;
    let globalAvgRating = 0;
    let totalReviews = 0;
    
    if (venues.length > 0) {
      totalReviews = venues.reduce((acc, v) => acc + (v.reviewCount || 0), 0);
      const totalRatingSum = venues.reduce((acc, v) => acc + (v.avgRating || 0) * (v.reviewCount || 0), 0);
      if (totalReviews > 0) {
        globalAvgRating = totalRatingSum / totalReviews;
      } else {
        globalAvgRating = venues.reduce((acc, v) => acc + (v.avgRating || 0), 0) / venues.length;
      }
    }

    // 3. Top Venues (Top 5 by avgRating and reviewCount)
    const topVenues = [...venues]
      .sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount)
      .slice(0, 5)
      .map(v => ({
        name: v.name,
        rating: Math.round((v.avgRating || 0) * 10) / 10,
        reviews: v.reviewCount || 0
      }));

    // 4. Crowd Trends aggregation
    const crowdTrendsRaw = await CrowdAnalytics.aggregate([
      { $match: { venueId: { $in: venueIds } } },
      { 
        $group: {
          _id: "$hour",
          busyCount: { $sum: "$busyCount" },
          quietCount: { $sum: "$quietCount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill missing hours
    const crowdTrends = [];
    for (let i = 0; i < 24; i++) {
      const match = crowdTrendsRaw.find(t => t._id === i);
      crowdTrends.push({
        hour: i,
        timeLabel: `${i.toString().padStart(2, '0')}:00`,
        busyCount: match ? match.busyCount : 0,
        quietCount: match ? match.quietCount : 0
      });
    }

    return res.status(200).json({
      overview: {
        totalVenues,
        globalAvgRating: Math.round(globalAvgRating * 10) / 10,
        totalReviews
      },
      topVenues,
      crowdTrends
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return res.status(500).json({ message: "Failed to fetch dashboard data." });
  }
}

export async function getVenueAnalytics(req, res) {
  return res.status(200).json({
    venueId: req.params.venueId,
    analytics: {
      bestTime: [],
      peakTime: [],
    },
  });
}
