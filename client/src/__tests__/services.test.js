import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import * as venueApi from "../services/venueApi";
import * as reviewApi from "../services/reviewApi";
import * as crowdApi from "../services/crowdApi";
import * as analyticsApi from "../services/analyticsApi";

vi.mock("axios");

describe("Client API Services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("venueApi", () => {
    it("getVenueDetails should fetch a specific venue", async () => {
      const mockData = { _id: "1", name: "Venue 1" };
      axios.get.mockResolvedValue({ data: mockData });
      
      const result = await venueApi.getVenueDetails("1");
      
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining("/api/venues/1"));
      expect(result).toEqual(mockData);
    });

    it("claimVenue should call post with token", async () => {
      const mockData = { _id: "1", ownerId: "user1" };
      axios.post.mockResolvedValue({ data: mockData });
      
      const result = await venueApi.claimVenue("1", "token123");
      
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/api/venues/1/claim"),
        {},
        { headers: { Authorization: "Bearer token123" } }
      );
      expect(result).toEqual(mockData);
    });
  });

  describe("reviewApi", () => {

    it("submitReview should post review data with token", async () => {
      const mockData = { _id: "r1", rating: 5 };
      axios.post.mockResolvedValue({ data: mockData });
      
      const reviewData = { venueId: "1", rating: 5, reviewText: "Great" };
      const result = await reviewApi.submitReview(reviewData, "token123");
      
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/api/reviews"),
        reviewData,
        { headers: { Authorization: "Bearer token123" } }
      );
      expect(result).toEqual(mockData);
    });

    it("voteOnReview should post vote data with token", async () => {
      const mockData = { _id: "r1", upvotes: ["u1"] };
      axios.post.mockResolvedValue({ data: mockData });
      
      const result = await reviewApi.voteOnReview("r1", "upvote", "token123");
      
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/api/reviews/r1/vote"),
        { voteType: "upvote" },
        { headers: { Authorization: "Bearer token123" } }
      );
      expect(result).toEqual(mockData);
    });
  });

  describe("crowdApi", () => {
    it("submitCrowdReport should post status with token", async () => {
      const mockData = { _id: "cr1", status: "busy" };
      axios.post.mockResolvedValue({ data: mockData });
      
      const result = await crowdApi.submitCrowdReport("1", "busy", "token123");
      
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/api/crowd"),
        { venueId: "1", status: "busy" },
        { headers: { Authorization: "Bearer token123" } }
      );
      expect(result).toEqual(mockData);
    });
  });

  describe("analyticsApi", () => {
    it("getOwnerDashboard should fetch dashboard with token", async () => {
      const mockData = { overview: { totalVenues: 1 } };
      axios.get.mockResolvedValue({ data: mockData });
      
      const result = await analyticsApi.getOwnerDashboard("token123");
      
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining("/api/analytics/dashboard"),
        { headers: { Authorization: "Bearer token123" } }
      );
      expect(result).toEqual(mockData);
    });
  });
});
