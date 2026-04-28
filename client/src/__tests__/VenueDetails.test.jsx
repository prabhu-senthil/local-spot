import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import VenueDetails from "../components/VenueDetails";
import { useAuth } from "../contexts/AuthContext";
import { getVenueDetails, claimVenue, resendClaimOTP, verifyClaimOTP } from "../services/venueApi";
import { voteOnReview } from "../services/reviewApi";

vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../services/venueApi", () => ({
  getVenueDetails: vi.fn(),
  claimVenue: vi.fn(),
  resendClaimOTP: vi.fn(),
  verifyClaimOTP: vi.fn(),
}));

vi.mock("../services/reviewApi", () => ({
  voteOnReview: vi.fn(),
}));

// Mock child components to keep tests focused
vi.mock("../components/ReviewForm", () => ({
  default: () => <div data-testid="mock-review-form">Review Form</div>,
}));

vi.mock("../components/CrowdReportToggle", () => ({
  default: () => <div data-testid="mock-crowd-toggle">Crowd Toggle</div>,
}));

// Mock react-router hooks
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ id: "venue1" }),
    useNavigate: () => mockNavigate,
  };
});

describe("VenueDetails", () => {
  const mockVenue = {
    _id: "venue1",
    name: "Test Cafe",
    category: "Coffee",
    avgRating: 4.5,
    reviewCount: 2,
    trustScore: 85,
    images: ["image1.jpg"],
    tags: ["Cozy", "Wifi"],
    reviews: [
      {
        _id: "r1",
        userId: { name: "User1" },
        rating: 5,
        reviewText: "Great place!",
        upvotes: [],
        downvotes: [],
      },
    ],
    crowd: { busy: 10, quiet: 2 },
    openingHours: {
      monday: { open: "09:00", close: "17:00" }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: { id: "1", name: "Test User", role: "user" },
      token: "valid-token",
    });
    getVenueDetails.mockResolvedValue(mockVenue);
    resendClaimOTP.mockResolvedValue({ message: "OTP resent", otpExpiresInSeconds: 120, resendAvailableInSeconds: 30 });
    verifyClaimOTP.mockResolvedValue({ venue: { ownerId: "owner1" } });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <VenueDetails />
      </BrowserRouter>
    );
  };

  it("should show loading state initially", () => {
    // delay resolution to see loading state
    let resolvePromise;
    getVenueDetails.mockReturnValue(new Promise(resolve => {
      resolvePromise = resolve;
    }));
    
    renderComponent();
    expect(screen.getByText("Loading venue details...")).toBeInTheDocument();
    
    // cleanup
    act(() => { resolvePromise(mockVenue); });
  });

  it("should show error if venue not found", async () => {
    getVenueDetails.mockRejectedValue(new Error("Not found"));
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Venue not found")).toBeInTheDocument();
    });
  });

  it("should display venue details", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Test Cafe")).toBeInTheDocument();
      expect(screen.getByText("4.5")).toBeInTheDocument(); // avg rating
      expect(screen.getByText("85")).toBeInTheDocument(); // trust score
      expect(screen.getByText("Cozy")).toBeInTheDocument(); // tag
      expect(screen.getByText("Great place!")).toBeInTheDocument(); // review
    });
  });

  it("should allow owner to claim venue if not claimed", async () => {
    useAuth.mockReturnValue({
      user: { id: "owner1", name: "Owner", role: "owner" },
      token: "valid-token",
    });
    
    // Venue is not claimed
    getVenueDetails.mockResolvedValue({ ...mockVenue, ownerId: null });
    claimVenue.mockResolvedValue({ venue: { ownerId: "owner1" } });

    renderComponent();

    const claimBtn = await screen.findByText("Claim this Venue as Owner");
    expect(claimBtn).toBeInTheDocument();

    act(() => {
      claimBtn.click();
    });

    await waitFor(() => {
      expect(claimVenue).toHaveBeenCalledWith("venue1");
    });
  });

  it("should allow voting on a review", async () => {
    voteOnReview.mockResolvedValue({
      ...mockVenue.reviews[0],
      upvotes: ["1"]
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Great place!")).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole("button");
    // Find the upvote button (it's the first vote button in the list)
    // The exact selection might be tricky, so we check if voteOnReview gets called
    // Let's trigger a click on the upvote button which has ThumbsUp icon
    // Actually, we can look for the button containing "0" upvotes initially
    
    // There are back buttons and vote buttons. We will just click the 2nd button (back is 1st, upvote is 2nd).
    // Or simpler, get buttons with '0' inside
    const voteBtns = screen.getAllByText("0");
    
    act(() => {
      voteBtns[0].click(); // Click upvote
    });

    await waitFor(() => {
      expect(voteOnReview).toHaveBeenCalledWith("r1", "upvote");
    });
  });

  it("should render review form for users", async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId("mock-review-form")).toBeInTheDocument();
    });
  });

  it("should render crowd toggle for users", async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId("mock-crowd-toggle")).toBeInTheDocument();
    });
  });
});
