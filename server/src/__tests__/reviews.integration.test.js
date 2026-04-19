import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import reviewRoutes from "../routes/reviews.routes.js";
import Review from "../models/Review.js";
import TrustScore from "../models/TrustScore.js";

const app = express();
app.use(express.json());
app.use("/api/reviews", reviewRoutes);

describe("Reviews Integration", () => {
  beforeAll(async () => {
    // Connect to a test db or mock mongoose
    // For this simple test suite without a real Mongo server, we can skip DB if we use mocks.
    // However, since it's an integration test, let's mock the Review.create and TrustScore.findOneAndUpdate
    vi.mock("../models/Review.js", () => ({
      default: {
        create: vi.fn().mockResolvedValue({ _id: "123", rating: 5 }),
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
          lean: vi.fn().mockResolvedValue([]),
        }),
      },
    }));
    vi.mock("../models/TrustScore.js", () => ({
      default: {
        findOneAndUpdate: vi.fn().mockResolvedValue({ score: 100 }),
        findOne: vi.fn().mockResolvedValue({ score: 100 }),
      },
    }));
  });

  const validToken = jwt.sign({ id: new mongoose.Types.ObjectId().toString(), role: "user" }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "1h" });

  it("should reject unauthenticated requests", async () => {
    const res = await request(app).post("/api/reviews").send({
      venueId: new mongoose.Types.ObjectId().toString(),
      rating: 5,
      crowdLevel: "quiet"
    });
    expect(res.status).toBe(401);
  });

  it("should reject invalid payloads", async () => {
    const res = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${validToken}`)
      .send({
        venueId: new mongoose.Types.ObjectId().toString(),
        rating: 6,
        crowdLevel: "invalid_level"
      });
    expect(res.status).toBe(400);
  });

  it("should create a review if authenticated and valid", async () => {
    const res = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${validToken}`)
      .send({
        venueId: new mongoose.Types.ObjectId().toString(),
        rating: 5,
        reviewText: "Great spot!",
        crowdLevel: "quiet"
      });
    
    // In our mock, it returns status 201
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("_id", "123");
  });
});
