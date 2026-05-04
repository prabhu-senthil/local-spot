import CrowdReport from "../models/CrowdReport.js";
import CrowdAnalytics from "../models/CrowdAnalytics.js";

export async function createCrowdReport(req, res) {
  try {
    const { venueId, status } = req.body;
    const userId = req.user.id;
 
    if (req.user.role === "owner" || req.user.role === "admin") {
      return res.status(403).json({
        message: `${req.user.role === "owner" ? "Venue owners" : "Administrators"} are not allowed to submit crowd reports.`
      });
    }
 
    const startOfHour = new Date();
    startOfHour.setMinutes(0, 0, 0);

    const existingThisHour = await CrowdReport.findOne({
      userId,
      createdAt: { $gte: startOfHour }
    });

    if (existingThisHour) {
      const nextAllowedAt = new Date(startOfHour.getTime() + 60 * 60 * 1000);
      return res.status(429).json({
        message: "You can only submit one crowd report per hour.",
        nextAllowedAt
      });
    }
 
    const newReport = await CrowdReport.create({
      venueId,
      userId,
      status,
      createdAt: new Date()
    });
 
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    const updateQuery = {
      $inc: { totalReports: 1 },
      $set: { lastUpdated: now }
    };

    if (status === "busy") updateQuery.$inc.busyCount = 1;
    else if (status === "quiet") updateQuery.$inc.quietCount = 1;
    else if (status === "moderate") updateQuery.$inc.moderateCount = 1;

    await CrowdAnalytics.findOneAndUpdate(
      { venueId, hour, dayOfWeek },
      updateQuery,
      { upsert: true, returnDocument: "after" }
    );

    return res.status(201).json(newReport);
  } catch (error) {
    console.error("Error creating crowd report:", error);
    return res.status(500).json({ message: "Failed to submit crowd report." });
  }
}
