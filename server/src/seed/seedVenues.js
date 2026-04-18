import dotenv from "dotenv";
import mongoose from "mongoose";
import Venue from "../models/Venue.js";
import fs from "fs";

const venues = JSON.parse(
  fs.readFileSync(new URL("../data/venues.json", import.meta.url))
);

dotenv.config();

const seedVenues = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("MongoDB connected for seeding");

    await Venue.deleteMany();

     // Add lastUpdated field dynamically
    const formattedVenues = venues.map((v) => ({
      ...v,
      crowdSummary: {
        ...v.crowdSummary,
        lastUpdated: new Date(),
      },
    }));

    await Venue.insertMany(formattedVenues);

    /* await Venue.insertMany([
      {
        name: "Test Restaurant",
        category: "Restaurant",
        location: {
          type: "Point",
          coordinates: [-6.59, 53.38],
        },
      },
    ]);
 */

   
    console.log("Data seeded");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedVenues();