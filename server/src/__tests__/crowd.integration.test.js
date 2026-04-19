import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import crowdRoutes from "../routes/crowd.routes.js";
import CrowdReport from "../models/CrowdReport.js";
import CrowdAnalytics from "../models/CrowdAnalytics.js";

const app = express();
app.use(express.json());
app.use("/api/crowd", crowdRoutes);

describe("Crowd Integration", () => {
  beforeAll(async () => {
    vi.mock("../models/CrowdReport.js", () => ({
      default: {
        create: vi.fn().mockResolvedValue({ _id: "cr1", status: "busy" }),
      },
    }));
    vi.mock("../models/CrowdAnalytics.js", () => ({
      default: {
        findOneAndUpdate: vi.fn().mockResolvedValue({ totalReports: 1, busyCount: 1 }),
      },
    }));
  });

  const validToken = jwt.sign(
    { id: new mongoose.Types.ObjectId().toString(), role: "user" },
    process.env.JWT_SECRET || "fallback_secret",
    { expiresIn: "1h" }
  );

  it("should reject unauthenticated requests", async () => {
    const res = await request(app).post("/api/crowd").send({
      venueId: new mongoose.Types.ObjectId().toString(),
      status: "busy"
    });
    expect(res.status).toBe(401);
  });

  it("should reject invalid payloads", async () => {
    const res = await request(app)
      .post("/api/crowd")
      .set("Authorization", `Bearer ${validToken}`)
      .send({
        venueId: new mongoose.Types.ObjectId().toString(),
        status: "packed"
      });
    expect(res.status).toBe(400);
  });

  it("should create a crowd report if authenticated and valid", async () => {
    const res = await request(app)
      .post("/api/crowd")
      .set("Authorization", `Bearer ${validToken}`)
      .send({
        venueId: new mongoose.Types.ObjectId().toString(),
        status: "busy"
      });
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("_id", "cr1");
  });
});
