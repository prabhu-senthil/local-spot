import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReviewForm from "../components/ReviewForm";
import * as reviewApi from "../services/reviewApi";

// Mock the API module
vi.mock("../services/reviewApi", () => ({
  submitReview: vi.fn(),
}));

describe("ReviewForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render correctly", () => {
    render(<ReviewForm venueId="123" />);
    expect(screen.getByText("Leave a Review")).toBeDefined();
    expect(screen.getByText("Submit Review")).toBeDefined();
  });

  it("should show an error if submitted without a rating", async () => {
    render(<ReviewForm venueId="123" />);
    const submitButton = screen.getByText("Submit Review");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Please select a rating.")).toBeDefined();
    });
    expect(reviewApi.submitReview).not.toHaveBeenCalled();
  });

  it("should submit successfully when form is valid", async () => {
    const mockOnSubmit = vi.fn();
    reviewApi.submitReview.mockResolvedValue({ _id: "rev1", rating: 5 });

    render(<ReviewForm venueId="123" onReviewSubmitted={mockOnSubmit} />);
    
    // Select a rating (the 5th star)
    const stars = screen.getAllByRole("button").filter(b => b.querySelector("svg"));
    fireEvent.click(stars[4]);

    // Fill review text
    const textarea = screen.getByPlaceholderText("What was it like?");
    fireEvent.change(textarea, { target: { value: "Amazing experience!" } });

    // Submit
    const submitButton = screen.getByText("Submit Review");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(reviewApi.submitReview).toHaveBeenCalledWith({
        venueId: "123",
        rating: 5,
        reviewText: "Amazing experience!",
        crowdLevel: "moderate", // default
        images: []
      });
      expect(mockOnSubmit).toHaveBeenCalledWith({ _id: "rev1", rating: 5 });
    });
  });
});
