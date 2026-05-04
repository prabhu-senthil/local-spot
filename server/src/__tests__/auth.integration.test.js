import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import app from "../../server.js";
import User from "../models/User.js";
import Venue from "../models/Venue.js";

describe("Role-Based Access Control Integration Tests", () => {
  let adminToken, ownerToken, reviewerToken;
  let testVenueId;

  beforeAll(async () => {

  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Venue.deleteMany({});

    const adminRes = await request(app).post("/api/auth/register").send({
      name: "Admin User",
      email: "admin@test.com",
      password: "password123",
      role: "admin"
    });
    adminToken = adminRes.body.token;

    const ownerRes = await request(app).post("/api/auth/register").send({
      name: "Owner User",
      email: "owner@test.com",
      password: "password123",
      role: "owner"
    });
    ownerToken = ownerRes.body.token;

    const reviewerRes = await request(app).post("/api/auth/register").send({
      name: "Reviewer User",
      email: "reviewer@test.com",
      password: "password123",
      role: "reviewer"
    });
    reviewerToken = reviewerRes.body.token;

    const venue = await Venue.create({
      name: "Test Venue",
      category: "Restaurant",
      location: { type: "Point", coordinates: [0, 0] },
      address: "123 Main St",
    });
    testVenueId = venue._id;
  });

  it("Reviewer should be able to submit a review", async () => {
    const res = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${reviewerToken}`)
      .send({
        venueId: testVenueId,
        rating: 5,
        reviewText: "Great place!",
        crowdLevel: "quiet"
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("_id");
  });

  it("Owner should NOT be able to submit a review", async () => {
    const res = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        venueId: testVenueId,
        rating: 5,
        reviewText: "I own this place!",
        crowdLevel: "quiet"
      });

    expect(res.status).toBe(403);
  });

  it("Reviewer should NOT be able to access owner dashboard analytics", async () => {
    const res = await request(app)
      .get("/api/analytics/dashboard")
      .set("Authorization", `Bearer ${reviewerToken}`);

    expect(res.status).toBe(401);
  });

  it("Owner should be able to access owner dashboard analytics", async () => {
    const res = await request(app)
      .get("/api/analytics/dashboard")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
  });

});
