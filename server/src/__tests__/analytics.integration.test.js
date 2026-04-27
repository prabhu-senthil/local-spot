import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import analyticsRoutes from "../routes/analytics.routes.js";
import Venue from "../models/Venue.js";
import CrowdAnalytics from "../models/CrowdAnalytics.js";
import User from "../models/User.js";

const app = express();
app.use(express.json());
app.use("/api/analytics", analyticsRoutes);

describe("Analytics Integration", () => {
  beforeAll(async () => {
    vi.mock("../models/Venue.js", () => ({
      default: {
        find: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { _id: "v1", name: "Venue 1", avgRating: 4.5, reviewCount: 10 },
            { _id: "v2", name: "Venue 2", avgRating: 3.5, reviewCount: 5 }
          ]),
        }),
      },
    }));

    vi.mock("../models/CrowdAnalytics.js", () => ({
      default: {
        aggregate: vi.fn().mockResolvedValue([
          { _id: 12, busyCount: 10, quietCount: 2 }
        ]),
      },
    }));

    vi.mock("../models/Review.js", () => ({
      default: {
        countDocuments: vi.fn().mockResolvedValue(15),
        find: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              sort: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  lean: vi.fn().mockResolvedValue([])
                })
              })
            })
          })
        })
      }
    }));

    vi.mock("../models/User.js", () => ({
      default: {
        findById: vi.fn().mockImplementation((id) => ({
          select: vi.fn().mockResolvedValue(
            id === "owner123" 
              ? { _id: "owner123", role: "owner" } 
              : { _id: "user123", role: "user" }
          )
        })),
      },
    }));
  });

  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = "fallback_secret";
  }

  const ownerToken = jwt.sign(
    { id: "owner123", role: "owner" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const userToken = jwt.sign(
    { id: "user123", role: "user" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  it("should reject unauthenticated requests", async () => {
    const res = await request(app).get("/api/analytics/dashboard");
    expect(res.status).toBe(401);
  });

  it("should reject requests from non-owners", async () => {
    const res = await request(app)
      .get("/api/analytics/dashboard")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(401);
  });

  it("should return dashboard data for owners", async () => {
    const res = await request(app)
      .get("/api/analytics/dashboard")
      .set("Authorization", `Bearer ${ownerToken}`);
    
    if (res.status !== 200) {
      console.log("analytics res.body", res.body);
    }
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("overview");
    expect(res.body.overview.totalVenues).toBe(2);
    expect(res.body.overview.totalReviews).toBe(15);
    expect(res.body.topVenues).toHaveLength(2);
    expect(res.body.crowdTrends).toHaveLength(24);
    expect(res.body.crowdTrends[12].busyCount).toBe(10);
  });
});
