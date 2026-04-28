import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import * as venueApi from "../services/venueApi";
import * as reviewApi from "../services/reviewApi";
import * as crowdApi from "../services/crowdApi";
import * as analyticsApi from "../services/analyticsApi";
import apiClient from "../services/apiClient";

vi.mock("../services/apiClient");

describe("Client API Services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("venueApi", () => {
    it("getVenueDetails should fetch a specific venue", async () => {
      const mockData = { _id: "1", name: "Venue 1" };
      apiClient.get.mockResolvedValue({ data: mockData });
      
      const result = await venueApi.getVenueDetails("1");
      
      expect(apiClient.get).toHaveBeenCalledWith("/venues/1");
      expect(result).toEqual(mockData);
    });

    it("claimVenue should call post without explicit token", async () => {
      const mockData = { _id: "1", ownerId: "user1" };
      apiClient.post.mockResolvedValue({ data: mockData });
      
      const result = await venueApi.claimVenue("1");
      
      expect(apiClient.post).toHaveBeenCalledWith("/venues/1/claim");
      expect(result).toEqual(mockData);
    });
  });

  describe("reviewApi", () => {

    it("submitReview should post review data", async () => {
      const mockData = { _id: "r1", rating: 5 };
      apiClient.post.mockResolvedValue({ data: mockData });
      
      const reviewData = { venueId: "1", rating: 5, reviewText: "Great" };
      const result = await reviewApi.submitReview(reviewData);
      
      expect(apiClient.post).toHaveBeenCalledWith("/reviews", reviewData);
      expect(result).toEqual(mockData);
    });

    it("voteOnReview should post vote data", async () => {
      const mockData = { _id: "r1", upvotes: ["u1"] };
      apiClient.post.mockResolvedValue({ data: mockData });
      
      const result = await reviewApi.voteOnReview("r1", "upvote");
      
      expect(apiClient.post).toHaveBeenCalledWith("/reviews/r1/vote", { voteType: "upvote" });
      expect(result).toEqual(mockData);
    });
  });

  describe("crowdApi", () => {
    it("submitCrowdReport should post status", async () => {
      const mockData = { _id: "cr1", status: "busy" };
      apiClient.post.mockResolvedValue({ data: mockData });
      
      const result = await crowdApi.submitCrowdReport("1", "busy");
      
      expect(apiClient.post).toHaveBeenCalledWith("/crowd", { venueId: "1", status: "busy" });
      expect(result).toEqual(mockData);
    });
  });

  describe("analyticsApi", () => {
    it("getOwnerDashboard should fetch dashboard", async () => {
      const mockData = { overview: { totalVenues: 1 } };
      apiClient.get.mockResolvedValue({ data: mockData });
      
      const result = await analyticsApi.getOwnerDashboard();
      
      expect(apiClient.get).toHaveBeenCalledWith("/analytics/dashboard");
      expect(result).toEqual(mockData);
    });
  });
});
