import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CrowdReportToggle from "../components/CrowdReportToggle";
import * as crowdApi from "../services/crowdApi";

vi.mock("../services/crowdApi", () => ({
  submitCrowdReport: vi.fn(),
}));

describe("CrowdReportToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render Quiet and Busy buttons", () => {
    render(<CrowdReportToggle venueId="123" />);
    expect(screen.getByText("Quiet")).toBeDefined();
    expect(screen.getByText("Busy")).toBeDefined();
  });

  it("should call submitCrowdReport on click", async () => {
    const mockOnSubmit = vi.fn();
    crowdApi.submitCrowdReport.mockResolvedValue({ _id: "cr1", status: "busy" });

    render(<CrowdReportToggle venueId="123" onReportSubmitted={mockOnSubmit} />);
    
    const busyButton = screen.getByText("Busy");
    fireEvent.click(busyButton);

    await waitFor(() => {
      expect(crowdApi.submitCrowdReport).toHaveBeenCalledWith("123", "busy");
      expect(mockOnSubmit).toHaveBeenCalledWith("busy");
    });
  });
});
