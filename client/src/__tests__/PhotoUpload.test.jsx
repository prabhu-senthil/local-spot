import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import PhotoUpload from "../components/PhotoUpload";
import axios from "axios";

vi.mock("axios");

// Mock lucide-react to avoid any issues with heavy SVG components
vi.mock("lucide-react", () => ({
  Camera: () => <div data-testid="camera-icon" />,
  X: () => <div data-testid="x-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  ImagePlus: () => <div data-testid="image-plus-icon" />,
}));

describe("PhotoUpload", () => {
  const mockOnUploadComplete = vi.fn();
  const token = "valid-token";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <PhotoUpload 
        token={token} 
        onUploadComplete={mockOnUploadComplete} 
        maxPhotos={3} 
        {...props} 
      />
    );
  };

  it("should render upload button initially", () => {
    renderComponent();
    expect(screen.getByText(/Add a photo/i)).toBeInTheDocument();
  });

  it("should display error if file type is invalid", async () => {
    renderComponent();
    
    const file = new File(["dummy content"], "test.txt", { type: "text/plain" });
    const input = screen.getByLabelText(/Add a photo/i);

    act(() => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/Only image files are allowed/i)).toBeInTheDocument();
    });
    
    expect(mockOnUploadComplete).not.toHaveBeenCalled();
  });

  it("should upload file successfully", async () => {
    axios.get.mockResolvedValue({
      data: {
        signature: "test-sig",
        timestamp: "123",
        cloudName: "testcloud",
        apiKey: "testkey"
      }
    });

    axios.post.mockResolvedValue({
      data: {
        secure_url: "https://example.com/image.jpg"
      }
    });

    renderComponent();
    
    const file = new File(["dummy image"], "test.jpg", { type: "image/jpeg" });
    const input = screen.getByLabelText(/Add a photo/i);

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalled();
      expect(mockOnUploadComplete).toHaveBeenCalledWith(["https://example.com/image.jpg"]);
    });
  });

  it("should allow removing a photo", async () => {
    renderComponent({ currentPhotos: ["https://example.com/image.jpg"] });
    
    const image = screen.getByAltText("Upload 0");
    expect(image).toBeInTheDocument();
    
    const removeBtn = screen.getByRole("button");
    
    act(() => {
      fireEvent.click(removeBtn);
    });

    expect(mockOnUploadComplete).toHaveBeenCalledWith([]);
  });
});
