import mongoose from "mongoose";
import Venue from "../models/Venue.js";
import Review from "../models/Review.js";
import CrowdReport from "../models/CrowdReport.js";
import User from "../models/User.js";
import { generateOTP, hashOTP, verifyOTP, sendOTPEmail } from "../services/otpService.js";

const GEOAPIFY_BASE_URL = "https://api.geoapify.com/v2/places";
const OTP_VALIDITY_MS = 120 * 1000;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
 
/** Dashboard category ids → Geoapify Places categories (comma-separated). */
const CATEGORY_TO_GEOAPIFY = {
  restaurants: "catering.restaurant,catering.fast_food",
  nightlife: "catering.bar,entertainment.nightclub",
  shopping: "commercial.shopping_mall,commercial.department_store",
  services: "service.beauty,service.hairdresser,service.car_repair",
  coffee: "catering.cafe",
  outdoors: "leisure.park",
};  

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

function sanitizeNameQuery(raw) {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, 200);
}

function resolveCategories(req) {
  const slug =
    typeof req.query.category === "string" && req.query.category.trim()
      ? req.query.category.trim()
      : null;
  if (slug && CATEGORY_TO_GEOAPIFY[slug]) return CATEGORY_TO_GEOAPIFY[slug];

  /** Legacy: Foursquare-style category ids from an older client. */
  const fsq = typeof req.query.categoryId === "string" ? req.query.categoryId.trim() : "";
  const fsqMap = {
    "13065": CATEGORY_TO_GEOAPIFY.restaurants,
    "13003": CATEGORY_TO_GEOAPIFY.nightlife,
    "17000": CATEGORY_TO_GEOAPIFY.shopping,
    "17100": CATEGORY_TO_GEOAPIFY.services,
    "13032": CATEGORY_TO_GEOAPIFY.coffee,
    "16000": CATEGORY_TO_GEOAPIFY.outdoors,
  };
  if (fsq && fsqMap[fsq]) return fsqMap[fsq];

  return CATEGORY_TO_GEOAPIFY.restaurants;
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

    const nameParam = sanitizeNameQuery(req.query.name);
    const queryParam = sanitizeNameQuery(req.query.query);
    const nameFilter = nameParam || queryParam;

    const url = new URL(GEOAPIFY_BASE_URL);

    // circle filter (lon, lat, radiusMeters)
    url.searchParams.set("filter", `circle:${lng},${lat},${radius}`);
    url.searchParams.set("categories", resolveCategories(req));
    url.searchParams.set("bias", `proximity:${lng},${lat}`);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("apiKey", apiKey);

    // Geoapify: optional "name" narrows to places matching the name (e.g. pizza, Starbucks).
    if (nameFilter) url.searchParams.set("name", nameFilter);

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
    const venue = await Venue.findById(req.params.id).lean();

    if (!venue) {
      return res.status(404).json({
        message: "Venue not found",
      });
    }

    // Fetch associated reviews
    const reviews = await Review.find({ venueId: venue._id })
      .populate("userId", "name reviewerTrustScore status")
      .sort({ createdAt: -1 })
      .lean();

    // Fetch associated crowd reports
    const crowdReports = await CrowdReport.find({ venueId: venue._id }).lean();
    
    // Calculate crowd stats
    let busyCount = 0;
    let quietCount = 0;
    
    for (const report of crowdReports) {
      if (report.status === "busy") busyCount++;
      if (report.status === "quiet") quietCount++;
    }

    // Generate a trust score (placeholder logic or calculate from reviews)
    // For now, let's say base trust score is 80, adjusted slightly by reviews
    const trustScore = 85;

    // Assemble the complete response object for the frontend
    const responseData = {
      ...venue,
      reviews: reviews,
      crowd: {
        busy: busyCount,
        quiet: quietCount
      },
      trustScore: trustScore
    };

    res.json(responseData);
  } catch (err) {
    next(err);
  }
};

export const claimVenue = async (req, res, next) => {
  try {
    console.log("Claiming venue with data:", req.body);
    const venueId = req.params.id;
    const venue = await Venue.findById(req.params.id);
    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }
    if (venue.ownerId) {
      return res.status(403).json({ message: "This venue has already been claimed." });
    }
    
    // Only Owners need OTP
    if (req.user.role !== "owner") {
      return res.status(403).json({ message: "Only users with the Owner role can claim restaurants." });
    }

    // Check if the user already owns a venue
    const existingVenue = await Venue.findOne({ ownerId: req.user.id });
    if (existingVenue) {
      return res.status(403).json({ message: "You can only claim one restaurant." });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // If an OTP is already active for the same venue, ask frontend to wait or verify.
    if (user.otpHash && user.otpExpires && user.otpTargetVenueId?.toString() === venueId) {
      const now = Date.now();
      const expiresInMs = new Date(user.otpExpires).getTime() - now;
      const resendInMs =
        user.otpRequestedAt
          ? new Date(user.otpRequestedAt).getTime() + OTP_RESEND_COOLDOWN_MS - now
          : 0;

      if (expiresInMs > 0) {
        return res.status(200).json({
          message: "OTP already sent. Please verify or resend after cooldown.",
          otpExpiresInSeconds: Math.ceil(expiresInMs / 1000),
          resendAvailableInSeconds: Math.max(0, Math.ceil(resendInMs / 1000)),
        });
      }
    }

    // Generate and send OTP from backend
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const now = new Date();
    const otpExpires = new Date(now.getTime() + OTP_VALIDITY_MS); // 120 seconds

    user.otpHash = otpHash;
    user.otpExpires = otpExpires;
    user.otpRequestedAt = now;
    user.otpTargetVenueId = venue._id;
    await user.save(); 
    await sendOTPEmail(user.email, otp); 
    res.status(200).json({ 
      message: "OTP sent to your email. Please verify to complete the claim.",
      otpExpiresInSeconds: Math.ceil(OTP_VALIDITY_MS / 1000),
      resendAvailableInSeconds: Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000),
    });
  } catch (err) {
    next(err);
  }
};

export const resendClaimOTP = async (req, res, next) => {
  try {
    const venueId = req.params.id;
    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ message: "Venue not found." });
    }
    if (venue.ownerId) {
      return res.status(403).json({ message: "This venue has already been claimed." });
    }

    const existingVenue = await Venue.findOne({ ownerId: req.user.id });
    if (existingVenue) {
      return res.status(403).json({ message: "You can only claim one restaurant." });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.otpTargetVenueId?.toString() !== venueId) {
      return res.status(400).json({
        message: "No claim OTP found for this venue. Start claim process first.",
      });
    }

    const nowMs = Date.now();
    const requestedAtMs = user.otpRequestedAt ? new Date(user.otpRequestedAt).getTime() : 0;
    const resendInMs = requestedAtMs + OTP_RESEND_COOLDOWN_MS - nowMs;
    if (resendInMs > 0) {
      return res.status(429).json({
        message: "Please wait before requesting another OTP.",
        resendAvailableInSeconds: Math.ceil(resendInMs / 1000),
      });
    }

    const otp = generateOTP();
    user.otpHash = await hashOTP(otp);
    user.otpExpires = new Date(nowMs + OTP_VALIDITY_MS);
    user.otpRequestedAt = new Date(nowMs);
    await user.save();

    await sendOTPEmail(user.email, otp);

    return res.status(200).json({
      message: "A new OTP has been sent to your email.",
      otpExpiresInSeconds: Math.ceil(OTP_VALIDITY_MS / 1000),
      resendAvailableInSeconds: Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000),
    });
  } catch (err) {
    next(err);
  }
};

export const verifyClaimOTP = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const venueId = req.params.id;

    if (!otp) {
      return res.status(400).json({ message: "OTP is required." });
    }

    const user = await User.findById(req.user.id);
    if (!user || !user.otpHash || !user.otpExpires) {
      return res.status(400).json({ message: "No active OTP request found." });
    }
    if (user.otpTargetVenueId?.toString() !== venueId) {
      return res.status(400).json({ message: "OTP does not match this venue claim request." });
    }

    // Check expiry
    if (user.otpExpires < new Date()) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    // Verify OTP
    const isValid = await verifyOTP(otp, user.otpHash);
    if (!isValid) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ message: "Venue not found." });
    }
    if (venue.ownerId) {
      return res.status(403).json({ message: "This venue has already been claimed." });
    }

    // Grant ownership
    venue.ownerId = user._id;
    await venue.save();

    // Clear OTP data
    user.otpHash = undefined;
    user.otpExpires = undefined;
    user.otpRequestedAt = undefined;
    user.otpTargetVenueId = undefined;
    await user.save();

    res.status(200).json({ message: "Venue claimed successfully", venue });
  } catch (err) {
    next(err);
  }
};

export const updateVenueImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ message: "Image URL is required" });
    }

    const venue = await Venue.findById(req.params.id);
    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    // Verify ownership
    if (venue.ownerId?.toString() !== req.user.id) {
      return res.status(403).json({ message: "You don't have permission to update this venue." });
    }

    // Since we're using Cloudinary, we just need to replace the first image in the array
    if (!venue.images) {
      venue.images = [];
    }
    
    // Set as the primary image (index 0)
    venue.images[0] = imageUrl;
    await venue.save();

    res.status(200).json({ message: "Venue image updated successfully", venue });
  } catch (err) {
    console.error("Error updating venue image:", err);
    next(err);
  }
};