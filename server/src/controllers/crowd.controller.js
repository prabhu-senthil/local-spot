import CrowdReport from "../models/CrowdReport.js";
import CrowdAnalytics from "../models/CrowdAnalytics.js";

export async function createCrowdReport(req, res) {
  try {
    const { venueId, status } = req.body;
    
    // Create the individual report document
    const newReport = await CrowdReport.create({
      venueId,
      status,
      createdAt: new Date()
    });

    // Aggregation Logic
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 is Sunday

    // Update CrowdAnalytics using upsert
    const updateQuery = {
      $inc: {
        totalReports: 1,
      },
      $set: {
        lastUpdated: now,
      }
    };

    if (status === "busy") {
      updateQuery.$inc.busyCount = 1;
    } else if (status === "quiet") {
      updateQuery.$inc.quietCount = 1;
    } else if (status === "moderate") {
      updateQuery.$inc.moderateCount = 1;
    }

    await CrowdAnalytics.findOneAndUpdate(
      { venueId, hour, dayOfWeek },
      updateQuery,
      { upsert: true, new: true }
    );

    return res.status(201).json(newReport);
  } catch (error) {
    console.error("Error creating crowd report:", error);
    return res.status(500).json({ message: "Failed to submit crowd report." });
  }
}
