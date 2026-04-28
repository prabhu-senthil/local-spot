import mongoose from "mongoose";
import dotenv from "dotenv";

// Models
import Review from "./src/models/Review.js";
import Venue from "./src/models/Venue.js";
import TrustScore from "./src/models/TrustScore.js";

dotenv.config();

const resetReviews = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL || "mongodb://localhost:27017/localspot");
    console.log("MongoDB connected.");

    // 1. Delete all reviews
    const deleteResult = await Review.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} reviews.`);

    // 2. Reset venue stats
    const updateResult = await Venue.updateMany(
      {},
      { 
        $set: { 
          reviewCount: 0, 
          avgRating: 0 
        } 
      }
    );
    console.log(`Reset stats for ${updateResult.modifiedCount} venues.`);

    // 3. Delete all trust scores to start fresh
    const trustResult = await TrustScore.deleteMany({});
    console.log(`Deleted ${trustResult.deletedCount} trust score records.`);

    console.log("Successfully cleaned up the database for testing.");
    process.exit(0);
  } catch (error) {
    console.error("Error resetting database:", error);
    process.exit(1);
  }
};

resetReviews();
