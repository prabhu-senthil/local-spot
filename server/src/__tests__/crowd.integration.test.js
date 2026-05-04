
import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

vi.mock("../models/CrowdReport.js", () => ({
  default: {
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ _id: "cr1", status: "busy" }),
  },
}));

vi.mock("../models/CrowdAnalytics.js", () => ({
  default: {
    findOneAndUpdate: vi.fn().mockResolvedValue({ totalReports: 1, busyCount: 1 }),
  },
}));

const tokenRoles = new Map();

vi.mock("../models/User.js", () => ({
  default: {
    findById: vi.fn().mockImplementation((id) => ({
      select: vi.fn().mockResolvedValue({
        _id: id,
        role: tokenRoles.get(String(id)) ?? "user",
      }),
    })),
  },
}));

import crowdRoutes from "../routes/crowd.routes.js";

if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "fallback_secret";

const app = express();
app.use(express.json());
app.use("/api/crowd", crowdRoutes);

const JWT_SECRET = process.env.JWT_SECRET;

const userId = new mongoose.Types.ObjectId().toString();
const ownerId = new mongoose.Types.ObjectId().toString();
tokenRoles.set(userId, "user");
tokenRoles.set(ownerId, "owner");

const userToken = jwt.sign({ id: userId, role: "user" }, JWT_SECRET, { expiresIn: "1h" });
const ownerToken = jwt.sign({ id: ownerId, role: "owner" }, JWT_SECRET, { expiresIn: "1h" });

const VALID_BODY = {
  venueId: new mongoose.Types.ObjectId().toString(),
  status: "busy",
};

describe("POST /api/crowd — Crowd Report Restrictions", () => {
  it("should return 401 when no auth token is provided", async () => {
    const res = await request(app).post("/api/crowd").send(VALID_BODY);
    expect(res.status).toBe(401);
  });

  it("should return 400 when status is invalid", async () => {
    const res = await request(app)
      .post("/api/crowd")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ venueId: new mongoose.Types.ObjectId().toString(), status: "packed" });
    expect(res.status).toBe(400);
  });

  it("should return 403 when an owner tries to submit a crowd report", async () => {
    const res = await request(app)
      .post("/api/crowd")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(VALID_BODY);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/owners are not allowed/i);
  });

  it("should return 201 when a regular user submits a valid crowd report (first this hour)", async () => {
    const CrowdReport = (await import("../models/CrowdReport.js")).default;
    CrowdReport.findOne.mockResolvedValueOnce(null);

    const res = await request(app)
      .post("/api/crowd")
      .set("Authorization", `Bearer ${userToken}`)
      .send(VALID_BODY);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("_id", "cr1");
  });

  it("should return 429 when user submits a second report within the same hour", async () => {
    const CrowdReport = (await import("../models/CrowdReport.js")).default;
    CrowdReport.findOne.mockResolvedValueOnce({ _id: "existing", status: "quiet" });

    const res = await request(app)
      .post("/api/crowd")
      .set("Authorization", `Bearer ${userToken}`)
      .send(VALID_BODY);

    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/one crowd report per hour/i);
    expect(res.body).toHaveProperty("nextAllowedAt");
  });

  it("429 nextAllowedAt should be at the start of the next hour (:00 minutes)", async () => {
    const CrowdReport = (await import("../models/CrowdReport.js")).default;
    CrowdReport.findOne.mockResolvedValueOnce({ _id: "existing", status: "busy" });

    const before = Date.now();
    const res = await request(app)
      .post("/api/crowd")
      .set("Authorization", `Bearer ${userToken}`)
      .send(VALID_BODY);

    expect(res.status).toBe(429);
    const nextAllowed = new Date(res.body.nextAllowedAt);
    expect(nextAllowed.getTime()).toBeGreaterThan(before);
    expect(nextAllowed.getTime() - before).toBeLessThanOrEqual(60 * 60 * 1000 + 1000);
    expect(nextAllowed.getMinutes()).toBe(0);
    expect(nextAllowed.getSeconds()).toBe(0);
  });
});
