import dotenv from "dotenv";
import mongoose from "mongoose";
import CrowdAnalytics from "../models/CrowdAnalytics.js";

dotenv.config();

const VENUE_ID = "69f7829ab137b3d4cb1c2ac3"; 

function intensity(hour, day) {
  const isWeekend = day === 0 || day === 5 || day === 6; 
  const isMidWeek = day >= 2 && day <= 4;
 
  if (hour < 10 || hour >= 22) return 0;
 
  if (hour < 11) return 1;
 
  if (hour < 12) return isWeekend ? 4 : 2;
 
  if (hour < 14) {
    if (isWeekend) return 8;
    if (isMidWeek) return 9;
    return 7; 
  }
 
  if (hour < 17) return isWeekend ? 5 : 3;
 
  if (hour < 20) {
    if (day === 5 || day === 6) return 10;
    if (day === 0) return 7;               
    return 7;                              
  }
 
  if (hour < 22) return isWeekend ? 5 : 3;

  return 0;
}


function jitter(base, maxDeviation) {
  const v = base + (Math.random() * 2 - 1) * maxDeviation;
  return Math.max(0, Math.round(v));
}


function generateCounts(intensityLevel) {
  if (intensityLevel === 0) return { busy: 0, quiet: 0, moderate: 0, total: 0 };

  const totalReports = jitter(intensityLevel * 2, 2);
  const busyFraction = 0.2 + (intensityLevel / 10) * 0.7;


  const busy     = Math.min(totalReports, jitter(totalReports * busyFraction, 1));
  const remaining = Math.max(0, totalReports - busy);
  const quiet    = Math.max(0, Math.min(remaining, jitter(remaining * 0.6, 1)));
  const moderate = Math.max(0, remaining - quiet);
  const total    = busy + quiet + moderate;

  return { busy, quiet, moderate, total };
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log("✅ Connected to MongoDB");

  const venueId = new mongoose.Types.ObjectId(VENUE_ID);


  const deleted = await CrowdAnalytics.deleteMany({ venueId });
  console.log(`🗑  Cleared ${deleted.deletedCount} existing CrowdAnalytics docs for Yeah Burgr`);

  const WEEKS = 4;
  const docs  = [];


  const buckets = new Map();

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

  let upserted = 0;
  for (const [key, counts] of buckets.entries()) {
    const [day, hour] = key.split("_").map(Number);
    if (counts.total === 0) continue;

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
