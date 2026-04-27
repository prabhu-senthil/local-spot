import request from "supertest";
import mongoose from "mongoose";
import app from "../../server.js";
import User from "../models/User.js";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

// We don't want to actually connect to the real DB or start a real server in the test
// So we ensure we are hitting the app instance directly, and mongoose is connected to memory DB
describe("Upload API Integration", () => {
  let token;
  let testUser;

  beforeAll(async () => {
    // We use the register API so that the password gets properly hashed
    const registerRes = await request(app).post("/api/auth/register").send({
      name: "Upload Test User",
      email: "uploadtest@example.com",
      password: "password123",
      role: "user",
    });

    token = registerRes.body.token;

    // We can fetch the user if needed later
    testUser = await User.findOne({ email: "uploadtest@example.com" });
  });

  afterAll(async () => {
    await User.deleteMany({});
  });

  it("should block unauthenticated requests to signature endpoint", async () => {
    const res = await request(app).get("/api/upload/signature");
    expect(res.status).toBe(401);
  });

  it("should return signature payload for authenticated users", async () => {
    // Set dummy env vars for test
    const origCloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const origApiKey = process.env.CLOUDINARY_API_KEY;
    const origApiSecret = process.env.CLOUDINARY_API_SECRET;

    process.env.CLOUDINARY_CLOUD_NAME = "test_cloud";
    process.env.CLOUDINARY_API_KEY = "12345";
    process.env.CLOUDINARY_API_SECRET = "secret_key";

    const res = await request(app)
      .get("/api/upload/signature")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("timestamp");
    expect(res.body).toHaveProperty("signature");
    expect(res.body.cloudName).toBe("test_cloud");
    expect(res.body.apiKey).toBe("12345");

    // Restore env vars
    process.env.CLOUDINARY_CLOUD_NAME = origCloudName;
    process.env.CLOUDINARY_API_KEY = origApiKey;
    process.env.CLOUDINARY_API_SECRET = origApiSecret;
  });
});
