import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import { DashboardPage } from "../pages/DashboardPage";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../services/apiClient";

vi.mock("../services/apiClient");

// Mock the Auth context
vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock mapbox-gl
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

describe("DashboardPage", () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());

    useAuth.mockReturnValue({
      user: { id: "1", name: "Test User", email: "test@example.com", role: "user" },
      logout: mockLogout,
    });

    // Mock geolocation
    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((success) =>
        success({
          coords: {
            latitude: 40.7128,
            longitude: -74.006,
          },
        })
      ),
    };
    Object.defineProperty(global.navigator, "geolocation", {
      value: mockGeolocation,
      configurable: true,
    });
    
    // Set mapbox token
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN = "dummy_token";
  });

  const renderDashboard = () => {
    return render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );
  };

  it("should render header with user info", async () => {
    global.fetch.mockImplementation(async (url) => {
      if (url.toString().includes("mapbox.com")) {
        return { ok: true, json: async () => ({ features: [{ place_name: "New York" }] }) };
      }
      return { ok: true, json: async () => [] };
    });
    apiClient.get.mockResolvedValue({ data: [] });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });
  });

  it("should fetch and display venues based on geolocation", async () => {
    global.fetch.mockImplementation(async (url) => {
      if (url.toString().includes("mapbox.com")) {
        return { ok: true, json: async () => ({ features: [{ place_name: "New York" }] }) };
      }
      return { ok: true, json: async () => [] };
    });

    apiClient.get.mockResolvedValue({
      data: [
        {
          _id: "venue1",
          name: "Test Restaurant",
          category: "Restaurants",
          latitude: 40.7128,
          longitude: -74.006,
          rating: 4.5,
          distanceText: "1.2 km"
        }
      ]
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Test Restaurant")).toBeInTheDocument();
      expect(screen.getByText("1.2 km")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Detecting location...").value).toBe("New York");
    });
  });

  it("should call logout when log out button is clicked", async () => {
    global.fetch.mockImplementation(async () => {
      return { ok: true, json: async () => [] };
    });

    renderDashboard();

    const logoutBtn = await screen.findByText("Log out");
    act(() => {
      logoutBtn.click();
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
