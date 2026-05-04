/**
 * seedCrowdInsights.js
 *
 * Seeds one month of realistic crowd report data for "Yeah Burgr" (Maynooth).
 *
 * Crowd patterns modelled on a typical fast-casual burger restaurant:
 *   - Weekday lunch peaks: 12:00–14:00
 *   - Weekday evening peaks: 17:00–20:00
 *   - Weekend (Fri/Sat) higher overall with extended evening busy period
 *   - Quiet overnight (22:00–10:00)
 *   - Moderate mid-morning / mid-afternoon
 *
 * Each historical day × hour slot is seeded directly into CrowdAnalytics
 * (aggregate collection) rather than creating individual CrowdReport documents,
 * since the historical reports would violate the 1-per-user-per-hour rule and
 * we only need the analytics aggregates for the chart.
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import CrowdAnalytics from "../models/CrowdAnalytics.js";

dotenv.config();

const VENUE_ID = "69f7829ab137b3d4cb1c2ac3"; // Yeah Burgr, Maynooth

// ── Crowd intensity profile ────────────────────────────────────────────────
// Returns a base intensity (0–10) for a given hour and day of week.
// day: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
function intensity(hour, day) {
  const isWeekend = day === 0 || day === 5 || day === 6; // Sun/Fri/Sat
  const isMidWeek = day >= 2 && day <= 4;               // Tue/Wed/Thu

  // Overnight (22–10): closed / very quiet
  if (hour < 10 || hour >= 22) return 0;

  // Morning pre-opening (10–11): quiet
  if (hour < 11) return 1;

  // Late morning (11–12): moderate opening
  if (hour < 12) return isWeekend ? 4 : 2;

  // Lunch peak (12–14): busiest weekday slot
  if (hour < 14) {
    if (isWeekend) return 8;
    if (isMidWeek) return 9;
    return 7; // Mon
  }

  // Post-lunch dip (14–17): moderate
  if (hour < 17) return isWeekend ? 5 : 3;

  // Evening peak (17–20): second busy period
  if (hour < 20) {
    if (day === 5 || day === 6) return 10; // Fri/Sat peak
    if (day === 0) return 7;               // Sunday evening
    return 7;                              // Weekday evening
  }

  // Late evening (20–22): winding down
  if (hour < 22) return isWeekend ? 5 : 3;

  return 0;
}

// ── Random helpers ────────────────────────────────────────────────────────
function jitter(base, maxDeviation) {
  const v = base + (Math.random() * 2 - 1) * maxDeviation;
  return Math.max(0, Math.round(v));
}

// Given an intensity 0–10, generate busyCount and quietCount for that slot
function generateCounts(intensityLevel) {
  if (intensityLevel === 0) return { busy: 0, quiet: 0, moderate: 0, total: 0 };

  const totalReports = jitter(intensityLevel * 2, 2);
  const busyFraction = 0.2 + (intensityLevel / 10) * 0.7;

  // Clamp busy so it never exceeds totalReports
  const busy     = Math.min(totalReports, jitter(totalReports * busyFraction, 1));
  const remaining = Math.max(0, totalReports - busy);
  const quiet    = Math.max(0, Math.min(remaining, jitter(remaining * 0.6, 1)));
  const moderate = Math.max(0, remaining - quiet);
  const total    = busy + quiet + moderate;

  return { busy, quiet, moderate, total };
}

// ── Main ──────────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log("✅ Connected to MongoDB");

  const venueId = new mongoose.Types.ObjectId(VENUE_ID);

  // Clear existing analytics for this venue
  const deleted = await CrowdAnalytics.deleteMany({ venueId });
  console.log(`🗑  Cleared ${deleted.deletedCount} existing CrowdAnalytics docs for Yeah Burgr`);

  // Build 4 weeks worth of daily data (28 days = one month)
  // We seed CrowdAnalytics which groups by dayOfWeek × hour.
  // Run across 4 complete weeks so each (day × hour) slot accumulates 4 days of data.
  const WEEKS = 4;
  const docs  = [];

  // Aggregate across 4 weeks into per-(dayOfWeek, hour) buckets
  const buckets = new Map(); // key: "day_hour" → { busyCount, quietCount, moderateCount, total }

  for (let week = 0; week < WEEKS; week++) {
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const level = intensity(hour, day);
        const { busy, quiet, moderate, total } = generateCounts(level);
        const key = `${day}_${hour}`;
        const existing = buckets.get(key) || { busy: 0, quiet: 0, moderate: 0, total: 0 };
        buckets.set(key, {
          busy:     existing.busy     + busy,
          quiet:    existing.quiet    + quiet,
          moderate: existing.moderate + moderate,
          total:    existing.total    + total,
        });
      }
    }
  }

  // Convert buckets to upsert operations
  let upserted = 0;
  for (const [key, counts] of buckets.entries()) {
    const [day, hour] = key.split("_").map(Number);
    if (counts.total === 0) continue; // skip empty overnight slots

    await CrowdAnalytics.findOneAndUpdate(
      { venueId, dayOfWeek: day, hour },
      {
        $set: {
          busyCount:     counts.busy,
          quietCount:    counts.quiet,
          moderateCount: counts.moderate,
          totalReports:  counts.total,
          lastUpdated:   new Date(),
        }
      },
      { upsert: true }
    );
    upserted++;
  }

  console.log(`✅ Seeded ${upserted} crowd analytics slots for Yeah Burgr (4 weeks × 7 days × ~12 active hours)`);

  // Print a quick summary of the pattern
  console.log("\n📊 Sample peak slots:");
  const peaks = await CrowdAnalytics.find({ venueId })
    .sort({ busyCount: -1 })
    .limit(5)
    .lean();
  
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  peaks.forEach(p =>
    console.log(`  ${DAY_NAMES[p.dayOfWeek]} ${String(p.hour).padStart(2,"0")}:00 — Busy: ${p.busyCount}, Quiet: ${p.quietCount}, Total: ${p.totalReports}`)
  );

  await mongoose.disconnect();
  console.log("\n✅ Done — crowd heatmap will now show realistic one-month patterns for Yeah Burgr.");
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
