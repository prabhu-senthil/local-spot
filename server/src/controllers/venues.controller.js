import mongoose from "mongoose";
import Venue from "../models/Venue.js";

const GEOAPIFY_BASE_URL = "https://api.geoapify.com/v2/places";


function getGeoapifyApiKey() {
  const key = process.env.GEOAPIFY_API_KEY;
  if (!key) {
    const err = new Error("Missing GEOAPIFY_API_KEY in server environment.");
    err.statusCode = 500;
    throw err;
  }
  return key;
}

function toFloat(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// Map Geoapify response → your app format
function mapVenue(v) {
  return {
    id: v.properties.place_id,
    name: v.properties.name || "Unknown",
    category: v.properties.categories?.[0] || "Restaurant",
    address: v.properties.formatted || "",
    latitude: v.geometry.coordinates[1],
    longitude: v.geometry.coordinates[0],
    distanceMeters: v.properties.distance || null,
    distanceText:
      typeof v.properties.distance === "number"
        ? `${(v.properties.distance / 1000).toFixed(1)} km`
        : "",
    rating: null, // Geoapify doesn't provide ratings
    price: "",
  };
}

// GET nearby venues
export async function getVenues(req, res, next) {
  try {
    const apiKey = getGeoapifyApiKey();

    const lat = toFloat(req.query.lat, NaN);
    const lng = toFloat(req.query.lng, NaN);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res
        .status(400)
        .json({ message: "Query params lat and lng are required numbers." });
    }

    const radius = Math.min(Math.max(toInt(req.query.radius, 2000), 500), 50000);
    const limit = Math.min(Math.max(toInt(req.query.limit, 20), 1), 50);

    const url = new URL(GEOAPIFY_BASE_URL);

    //circle filter (lng,lat,radius)
    url.searchParams.set("filter", `circle:${lng},${lat},${radius}`);
    url.searchParams.set("categories", "catering.restaurant");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("apiKey", apiKey);

    const response = await fetch(url);

    if (!response.ok) {
      const body = await response.text();
      const err = new Error(`Geoapify search failed: ${response.status} ${body}`);
      err.statusCode = 502;
      throw err;
    }

    const data = await response.json();

    /* const venues = Array.isArray(data.features)
      ? data.features.map(mapVenue)
      : [];

    return res.status(200).json(venues); */
    const venues = [];

    for (const feature of data.features) {
      const mapped = mapVenue(feature);

      // Check if venue already exists (by name + coordinates)
      let existing = await Venue.findOne({
        name: mapped.name,
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [mapped.longitude, mapped.latitude],
            },
            $maxDistance: 10, // meters
          },
        },
      });

      /*     findOne({
            name: mapped.name,
            "location.coordinates": [mapped.longitude, mapped.latitude],
          }); */

      if (!existing) {
        existing = await Venue.create({
          name: mapped.name,
          category: mapped.category,
          address: mapped.address,
          location: {
            type: "Point",
            coordinates: [mapped.longitude, mapped.latitude],
          },
        });
      }

      //  return MongoDB _id
      venues.push({
        _id: existing._id,
        name: existing.name,
        category: existing.category,
        address: existing.address,
        latitude: mapped.latitude,
        longitude: mapped.longitude,
        distanceText: mapped.distanceText,
      });
    }

    return res.status(200).json(venues);
  } catch (err) {
    return next(err);
  }
}

// GET single venue 
/* export async function getVenueById(req, res, next) {
  try {
    return res.status(501).json({
      message: "Geoapify does not support fetching a single venue by ID.",
    });
  } catch (err) {
    return next(err);
  }
} */

export const getVenueById = async (req, res, next) => {
  try {
    const venueId = new mongoose.Types.ObjectId(req.params.id);

    const result = await Venue.aggregate([
      { $match: { _id: venueId } },

      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "venueId",
          as: "reviews",
        },
      },
      {
        $lookup: {
          from: "crowdreports",
          localField: "_id",
          foreignField: "venueId",
          as: "crowdReports",
        },
      },
      {
        $lookup: {
          from: "trustscores",
          localField: "_id",
          foreignField: "venueId",
          as: "trust",
        },
      },
      {
        $addFields: {
          trustScore: {
            $arrayElemAt: ["$trust.score", 0],
          },
          crowd: {
            busy: {
              $size: {
                $filter: {
                  input: "$crowdReports",
                  as: "c",
                  cond: { $eq: ["$$c.status", "busy"] },
                },
              },
            },
            quiet: {
              $size: {
                $filter: {
                  input: "$crowdReports",
                  as: "c",
                  cond: { $eq: ["$$c.status", "quiet"] },
                },
              },
            },
          },
        },
      },
    ]);

    // Error handling
    if (result.length === 0) {
      return res.status(404).json({
        message: "Venue not found",
      });
    }

    res.json(result[0]);
  } catch (err) {
    next(err);
  }
};