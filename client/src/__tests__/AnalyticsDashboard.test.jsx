import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AnalyticsDashboard from "../pages/AnalyticsDashboard";
import * as analyticsApi from "../services/analyticsApi";
import { useAuth } from "../contexts/AuthContext";
import { BrowserRouter } from "react-router-dom";

vi.mock("../services/analyticsApi", () => ({
  getOwnerDashboard: vi.fn(),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock Recharts so jsdom doesn't complain about SVGs
vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
    LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  };
});

describe("AnalyticsDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should restrict access to non-owners", () => {
    useAuth.mockReturnValue({ user: { role: "user" }, token: "abc" });
    analyticsApi.getOwnerDashboard.mockReturnValue(new Promise(() => {}));
    render(
      <BrowserRouter>
        <AnalyticsDashboard />
      </BrowserRouter>
    );
    expect(screen.getByText("You must be an owner or admin to view this page.")).toBeDefined();
  });

  it("should render loading state initially for owners", () => {
    useAuth.mockReturnValue({ user: { role: "owner" }, token: "abc" });
    // mock a promise that doesn't resolve immediately
    analyticsApi.getOwnerDashboard.mockReturnValue(new Promise(() => {}));
    
    const { container } = render(
      <BrowserRouter>
        <AnalyticsDashboard />
      </BrowserRouter>
    );
    // Loading spinner check
    expect(container.querySelector(".animate-spin")).toBeDefined();
  });

  it("should render dashboard data when loaded", async () => {
    useAuth.mockReturnValue({ user: { role: "owner" }, token: "abc" });
    analyticsApi.getOwnerDashboard.mockResolvedValue({
      restaurantInfo: { name: "Test Venue", category: "Cafe" },
      overview: { totalVenues: 2, globalAvgRating: 4.5, totalReviews: 15 },
      topVenues: [],
      crowdTrends: []
    });

    render(
      <BrowserRouter>
        <AnalyticsDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Owner Dashboard")).toBeDefined();
      // Total Venues
      expect(screen.getByText("2")).toBeDefined();
      // Total Reviews
      expect(screen.getByText("15")).toBeDefined();
      
      expect(screen.getByTestId("bar-chart")).toBeDefined();
      expect(screen.getByTestId("line-chart")).toBeDefined();
    });
  });
});
