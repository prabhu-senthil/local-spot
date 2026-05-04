import Venue from "../models/Venue.js";
import CrowdAnalytics from "../models/CrowdAnalytics.js";
import Review from "../models/Review.js";

export async function getOwnerDashboard(req, res) {
  try {
    const isOwner = req.user.role === "owner";
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
        allVenues: [],
        recentReviews: [],
        restaurantInfo: null
      });
    }

    const venueIds = venues.map((v) => v._id);
    let restaurantInfo = null;

    if (isOwner && venues.length > 0) {
      const primaryVenue = venues[0];
      restaurantInfo = {
        name: primaryVenue.name,
        image: primaryVenue.images && primaryVenue.images.length > 0 ? primaryVenue.images[0] : null,
        category: primaryVenue.category
      };
    }

    // 2. Overview Stats
    const totalVenues = venues.length;
    let globalAvgRating = 0;
    
    // Fetch exact review count directly from the Reviews collection
    const totalReviews = await Review.countDocuments(isAdmin ? {} : { venueId: { $in: venueIds } });
    
    if (venues.length > 0) {
      const totalRatingSum = venues.reduce((acc, v) => acc + (v.avgRating || 0) * (v.reviewCount || 0), 0);
      const cachedReviewSum = venues.reduce((acc, v) => acc + (v.reviewCount || 0), 0);
      
      if (cachedReviewSum > 0) {
        globalAvgRating = totalRatingSum / cachedReviewSum;
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

    // 4. Crowd Insight aggregation — group by dayOfWeek × hour
    const heatmapRaw = await CrowdAnalytics.aggregate([
      { $match: { venueId: { $in: venueIds } } },
      {
        $group: {
          _id: { day: "$dayOfWeek", hour: "$hour" },
          busyCount:  { $sum: "$busyCount" },
          quietCount: { $sum: "$quietCount" },
          total:      { $sum: "$totalReports" }
        }
      },
      { $sort: { "_id.day": 1, "_id.hour": 1 } }
    ]);

    // Build a lookup map and zero-fill all 168 day×hour slots
    const heatmapLookup = new Map(
      heatmapRaw.map(d => [`${d._id.day}_${d._id.hour}`, d])
    );

    const crowdInsightMap = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const entry = heatmapLookup.get(`${day}_${hour}`);
        crowdInsightMap.push({
          day,
          hour,
          busyCount:  entry ? entry.busyCount  : 0,
          quietCount: entry ? entry.quietCount : 0,
          total:      entry ? entry.total       : 0
        });
      }
    }

    // 5. Fetch recent reviews for detailed view
    const allReviews = await Review.find({ venueId: { $in: venueIds } })
      .populate("userId", "name email")
      .populate("venueId", "name")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      overview: {
        totalVenues,
        globalAvgRating: Math.round(globalAvgRating * 10) / 10,
        totalReviews
      },
      topVenues,
      crowdInsightMap,
      allVenues: venues.map(v => ({
        _id: v._id,
        name: v.name,
        category: v.category,
        address: v.address,
        avgRating: Math.round((v.avgRating || 0) * 10) / 10,
        reviewCount: v.reviewCount || 0
      })),
      recentReviews: allReviews.map(r => ({
        _id: r._id,
        venueName: r.venueId?.name || "Unknown Venue",
        userName: r.userId?.name || "Anonymous",
        rating: r.rating,
        text: r.reviewText,
        createdAt: r.createdAt
      })),
      restaurantInfo
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
