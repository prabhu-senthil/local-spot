import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthPage } from "../pages/AuthPage";
import { AuthProvider } from "../contexts/AuthContext";
import { BrowserRouter } from "react-router-dom";

// Mock the AuthContext so we can control login/register responses
vi.mock("../contexts/AuthContext", async () => {
  const actual = await vi.importActual("../contexts/AuthContext");
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

import { useAuth } from "../contexts/AuthContext";

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("AuthPage Role Redirects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should navigate to /dashboard for user role on login", async () => {
    const mockLogin = vi.fn().mockResolvedValue({ role: "user" });
    useAuth.mockReturnValue({
      login: mockLogin,
      register: vi.fn(),
      error: "",
      setError: vi.fn(),
    });

    render(
      <BrowserRouter>
        <AuthPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: "user@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "password123" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Sign in" })[1]);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
    });
  });

  it("should navigate to /dashboard for reviewer role on login", async () => {
    const mockLogin = vi.fn().mockResolvedValue({ role: "reviewer" });
    useAuth.mockReturnValue({
      login: mockLogin,
      register: vi.fn(),
      error: "",
      setError: vi.fn(),
    });

    render(
      <BrowserRouter>
        <AuthPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: "reviewer@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "password123" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Sign in" })[1]);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
    });
  });

  it("should navigate to /owner/dashboard for owner role on login", async () => {
    const mockLogin = vi.fn().mockResolvedValue({ role: "owner" });
    useAuth.mockReturnValue({
      login: mockLogin,
      register: vi.fn(),
      error: "",
      setError: vi.fn(),
    });

    render(
      <BrowserRouter>
        <AuthPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: "owner@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "password123" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Sign in" })[1]);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/owner/dashboard", { replace: true });
    });
  });

  it("should navigate to /owner/dashboard for admin role on login", async () => {
    const mockLogin = vi.fn().mockResolvedValue({ role: "admin" });
    useAuth.mockReturnValue({
      login: mockLogin,
      register: vi.fn(),
      error: "",
      setError: vi.fn(),
    });

    render(
      <BrowserRouter>
        <AuthPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: "admin@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "password123" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Sign in" })[1]);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/owner/dashboard", { replace: true });
    });
  });
});
