import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import { DashboardPage } from "../pages/DashboardPage";
import { useAuth } from "../contexts/AuthContext";

// ── Mock Auth Context ─────────────────────────────────────────────────────────
vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// ── Mock geoapify (venue search) ──────────────────────────────────────────────
// DashboardPage calls searchNearbyVenues from geoapify.js, not apiClient.
// We mock the whole module so tests control exactly what venues are returned.
vi.mock("../services/geoapify", () => ({
  searchNearbyVenues: vi.fn(),
  searchRestaurants: vi.fn(),
}));

// ── Mock apiClient (needed by other imports; prevents interceptors crash) ─────
vi.mock("../services/apiClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

// ── Mock mapbox-gl ────────────────────────────────────────────────────────────
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
      return {
        setHTML: vi.fn().mockReturnThis(),
      };
    }),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockUser = {
  id: "1",
  name: "Test User",
  email: "test@example.com",
  role: "user",
  reviewerTrustScore: 0,
  status: "active",
};

describe("DashboardPage", () => {
  const mockLogout = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default auth mock
    useAuth.mockReturnValue({
      user: mockUser,
      logout: mockLogout,
      refreshUser: vi.fn(),
    });

    // Default geolocation mock — resolves immediately
    Object.defineProperty(global.navigator, "geolocation", {
      value: {
        getCurrentPosition: vi.fn().mockImplementation((success) =>
          success({ coords: { latitude: 40.7128, longitude: -74.006 } })
        ),
      },
      configurable: true,
    });

    // Default global fetch — handles reverse geocode (Mapbox) and any fallback
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url) => {
        if (url.toString().includes("mapbox.com")) {
          return {
            ok: true,
            json: async () => ({
              features: [{ place_name: "New York" }],
            }),
          };
        }
        return { ok: true, json: async () => [] };
      })
    );

    // Default searchNearbyVenues — empty list (overridden per test)
    const { searchNearbyVenues } = await import("../services/geoapify");
    searchNearbyVenues.mockResolvedValue([]);
  });

  const renderDashboard = () =>
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

  // ── Tests ──────────────────────────────────────────────────────────────────

  it("should render header with user info", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });
  });

  it("should fetch and display venues based on geolocation", async () => {
    const { searchNearbyVenues } = await import("../services/geoapify");

    // Provide test venues via the geoapify mock
    searchNearbyVenues.mockResolvedValue([
      {
        _id: "venue1",
        name: "Test Restaurant",
        category: "Restaurants",
        latitude: 40.7128,
        longitude: -74.006,
        rating: 4.5,
        distanceText: "1.2 km",
      },
    ]);

    renderDashboard();

    await waitFor(
      () => {
        expect(screen.getByText("Test Restaurant")).toBeInTheDocument();
        expect(screen.getByText("1.2 km")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("should call logout when log out button is clicked", async () => {
    renderDashboard();

    const logoutBtn = await screen.findByText("Log out");
    act(() => {
      logoutBtn.click();
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
