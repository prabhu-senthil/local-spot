/**
 * TrustBadge.test.jsx
 * Frontend unit tests for trust score badge + status pill in DashboardPage header.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import { DashboardPage } from "../pages/DashboardPage";
import { useAuth } from "../contexts/AuthContext";

// ── Mock dependencies ────────────────────────────────────────────────────────
vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../services/geoapify", () => ({
  searchNearbyVenues: vi.fn().mockResolvedValue([]),
}));

vi.mock("mapbox-gl", () => ({
  default: {
    Map: vi.fn(function () {
      return {
        addControl: vi.fn(),
        remove: vi.fn(),
        setCenter: vi.fn(),
        flyTo: vi.fn(),
      };
    }),
    NavigationControl: vi.fn(function () {}),
    Marker: vi.fn(function () {
      return {
        setLngLat: vi.fn().mockReturnThis(),
        setPopup: vi.fn().mockReturnThis(),
        addTo: vi.fn().mockReturnThis(),
        remove: vi.fn(),
      };
    }),
    Popup: vi.fn(function () {
      return { setHTML: vi.fn().mockReturnThis() };
    }),
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderDashboard() {
  return render(
    <BrowserRouter>
      <DashboardPage />
    </BrowserRouter>
  );
}

function setupGeo() {
  Object.defineProperty(global.navigator, "geolocation", {
    value: {
      getCurrentPosition: vi.fn().mockImplementation((success) =>
        success({ coords: { latitude: 51.5, longitude: -0.1 } })
      ),
    },
    configurable: true,
  });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ features: [] }),
  }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Trust Score Badge in DashboardPage header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupGeo();
  });

  it("displays trust score badge with positive score for active user", async () => {
    useAuth.mockReturnValue({
      user: {
        id: "1",
        name: "Test User",
        email: "test@example.com",
        role: "user",
        reviewerTrustScore: 7,
        status: "active",
      },
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    renderDashboard();

    await waitFor(() => {
      const badge = screen.getByTestId
        ? null
        : screen.queryByText(/Trust: \+7/);
      // Use the id we set: trust-score-badge
      const badgeEl = document.getElementById("trust-score-badge");
      expect(badgeEl).toBeTruthy();
      expect(badgeEl.textContent).toContain("+7");
    });
  });

  it("displays trust score badge with negative score in red", async () => {
    useAuth.mockReturnValue({
      user: {
        id: "2",
        name: "Negative User",
        email: "neg@example.com",
        role: "user",
        reviewerTrustScore: -3,
        status: "active",
      },
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    renderDashboard();

    await waitFor(() => {
      const badgeEl = document.getElementById("trust-score-badge");
      expect(badgeEl).toBeTruthy();
      expect(badgeEl.textContent).toContain("-3");
      // Badge should have red styling for negative scores
      expect(badgeEl.className).toContain("red");
    });
  });

  it("displays Active status pill for active users", async () => {
    useAuth.mockReturnValue({
      user: {
        id: "3",
        name: "Active User",
        email: "active@example.com",
        role: "user",
        reviewerTrustScore: 5,
        status: "active",
      },
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    renderDashboard();

    await waitFor(() => {
      const pill = document.getElementById("reviewer-status-pill");
      expect(pill).toBeTruthy();
      expect(pill.textContent).toContain("Active");
      expect(pill.className).toContain("green");
    });
  });

  it("displays Blocked status pill for blocked users", async () => {
    useAuth.mockReturnValue({
      user: {
        id: "4",
        name: "Blocked User",
        email: "blocked@example.com",
        role: "user",
        reviewerTrustScore: -10,
        status: "blocked",
      },
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    renderDashboard();

    await waitFor(() => {
      const pill = document.getElementById("reviewer-status-pill");
      expect(pill).toBeTruthy();
      expect(pill.textContent).toContain("Blocked");
      expect(pill.className).toContain("red");
    });
  });

  it("does NOT show trust badge for owner role", async () => {
    useAuth.mockReturnValue({
      user: {
        id: "5",
        name: "Owner",
        email: "owner@example.com",
        role: "owner",
        reviewerTrustScore: 0,
        status: "active",
      },
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    renderDashboard();

    await waitFor(() => {
      const badgeEl = document.getElementById("trust-score-badge");
      expect(badgeEl).toBeNull();
    });
  });

  it("does NOT show trust badge for admin role", async () => {
    useAuth.mockReturnValue({
      user: {
        id: "6",
        name: "Admin",
        email: "admin@example.com",
        role: "admin",
        reviewerTrustScore: 0,
        status: "active",
      },
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    renderDashboard();

    await waitFor(() => {
      const badgeEl = document.getElementById("trust-score-badge");
      expect(badgeEl).toBeNull();
    });
  });

  it("calls refreshUser on mount to ensure fresh trust data", async () => {
    const mockRefreshUser = vi.fn();
    useAuth.mockReturnValue({
      user: {
        id: "7",
        name: "Refresh User",
        email: "refresh@example.com",
        role: "user",
        reviewerTrustScore: 2,
        status: "active",
      },
      logout: vi.fn(),
      refreshUser: mockRefreshUser,
    });

    renderDashboard();

    await waitFor(() => {
      expect(mockRefreshUser).toHaveBeenCalledTimes(1);
    });
  });
});
