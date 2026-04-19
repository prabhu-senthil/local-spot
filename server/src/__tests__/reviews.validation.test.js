import { describe, it, expect, vi } from "vitest";
import { validateReviewInput } from "../middleware/validate.js";

describe("Review Validation Middleware", () => {
  const mockResponse = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  it("should fail if rating is missing", () => {
    const req = { body: { reviewText: "Great", crowdLevel: "quiet" } };
    const res = mockResponse();
    const next = vi.fn();

    validateReviewInput(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Rating must be a number between 1 and 5." });
    expect(next).not.toHaveBeenCalled();
  });

  it("should fail if rating is out of bounds", () => {
    const req = { body: { rating: 6, crowdLevel: "quiet" } };
    const res = mockResponse();
    const next = vi.fn();

    validateReviewInput(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("should fail if crowdLevel is invalid", () => {
    const req = { body: { rating: 4, crowdLevel: "unknown" } };
    const res = mockResponse();
    const next = vi.fn();

    validateReviewInput(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("should call next if valid payload", () => {
    const req = { body: { rating: 5, reviewText: "Awesome!", crowdLevel: "moderate" } };
    const res = mockResponse();
    const next = vi.fn();

    validateReviewInput(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
