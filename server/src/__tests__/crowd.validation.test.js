import { describe, it, expect, vi } from "vitest";
import { validateCrowdReportInput } from "../middleware/validate.js";

describe("Crowd Validation Middleware", () => {
  const mockResponse = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  it("should fail if venueId is missing", () => {
    const req = { body: { status: "busy" } };
    const res = mockResponse();
    const next = vi.fn();

    validateCrowdReportInput(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Valid venueId is required." });
    expect(next).not.toHaveBeenCalled();
  });

  it("should fail if status is invalid", () => {
    const req = { body: { venueId: "123", status: "packed" } };
    const res = mockResponse();
    const next = vi.fn();

    validateCrowdReportInput(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Status must be either "busy" or "quiet".' });
  });

  it("should call next if payload is valid", () => {
    const req = { body: { venueId: "123", status: "quiet" } };
    const res = mockResponse();
    const next = vi.fn();

    validateCrowdReportInput(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
