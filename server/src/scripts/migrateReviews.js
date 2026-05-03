/**
 * migrateReviews.js
 *
 * One-time migration script: re-evaluates all existing Review documents
 * using the new fakeReviewDetectionService and updates:
 *   - suspicionScore
 *   - suspicionClassification
 *   - isSuspicious
 *   - mlScore (refreshed from Python service)
 *
 * Run with:
 *   node --experimental-vm-modules server/src/scripts/migrateReviews.js
 * or simply:
 *   node server/src/scripts/migrateReviews.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

// Import models and service AFTER env is loaded
const { default: Review } = await import("../models/Review.js");
const { detectFakeReview } = await import("../services/fakeReviewDetectionService.js");

const MONGO_URI = process.env.MONGO_URL || "mongodb://localhost:27017/localspot";

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB:", MONGO_URI);

  const reviews = await Review.find({}).lean();
  console.log(`🔍 Found ${reviews.length} review(s) to re-evaluate...\n`);

  let updated = 0;
  let failed = 0;

  for (const review of reviews) {
    try {
      const text = review.reviewText || "";
      const rating = review.rating || 3;

      const analysis = await detectFakeReview(text, { rating });

      await Review.findByIdAndUpdate(review._id, {
        $set: {
          suspicionScore: analysis.suspicionScore,
          suspicionClassification: analysis.classification,
          isSuspicious: analysis.isSuspicious,
          mlScore: analysis.mlScore,
        },
      });

      const badge =
        analysis.classification === "highly_suspicious"
          ? "🚫 HIGHLY SUSPICIOUS"
          : analysis.classification === "suspicious"
          ? "⚠  SUSPICIOUS"
          : "✅ genuine";

      console.log(
        `[${badge}] ${(analysis.suspicionScore * 100).toFixed(0)}% | "${text.slice(0, 60)}"`
      );
      if (analysis.flags.length > 0) {
        console.log(`         Flags: ${analysis.flags.join(", ")}`);
      }

      updated++;
    } catch (err) {
      console.error(`❌ Failed for review ${review._id}:`, err.message);
      failed++;
    }
  }

  console.log(`\n✅ Migration complete. Updated: ${updated}, Failed: ${failed}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
