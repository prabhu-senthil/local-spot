import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import apiClient from "../services/apiClient";

vi.mock("../services/apiClient");

// A dummy component to consume the context
function TestComponent() {
  const { user, token, loading, error, login, logout, register } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div data-testid="user-name">{user?.name}</div>
      <div data-testid="user-role">{user?.role}</div>
      <div data-testid="token">{token}</div>
      <div data-testid="error">{error}</div>
      <button onClick={() => login({ email: "test@test.com", password: "password" })}>Login</button>
      <button onClick={logout}>Logout</button>
      <button onClick={() => register({ name: "New User", email: "new@test.com", password: "password", role: "user" })}>Register</button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("should initialize without user if no token in localStorage", async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).toBeNull();
    });

    expect(screen.getByTestId("user-name").textContent).toBe("");
    expect(screen.getByTestId("token").textContent).toBe("");
  });

  it("should load user if token exists in localStorage", async () => {
    localStorage.setItem("localspot_auth", JSON.stringify({ token: "valid-token" }));
    
    apiClient.get.mockResolvedValueOnce({
      data: { id: "1", name: "Saved User", email: "saved@test.com", role: "user" }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-name").textContent).toBe("Saved User");
      expect(screen.getByTestId("token").textContent).toBe("valid-token");
    });
  });

  it("should clear auth if token is invalid", async () => {
    localStorage.setItem("localspot_auth", JSON.stringify({ token: "invalid-token" }));
    
    apiClient.get.mockRejectedValueOnce({
      response: { data: { message: "Invalid token" } }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-name").textContent).toBe("");
      expect(screen.getByTestId("error").textContent).toBe("Invalid token");
    });
  });

  it("should login and set user state", async () => {
    apiClient.post.mockResolvedValueOnce({
      data: { id: "1", name: "Logged In", email: "log@test.com", role: "admin", token: "new-token" }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.queryByText("Loading...")).toBeNull());

    act(() => {
      screen.getByText("Login").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user-name").textContent).toBe("Logged In");
      expect(screen.getByTestId("user-role").textContent).toBe("admin");
      expect(screen.getByTestId("token").textContent).toBe("new-token");
      expect(JSON.parse(localStorage.getItem("localspot_auth")).token).toBe("new-token");
    });
  });

  it("should logout and clear state", async () => {
    // start logged in
    localStorage.setItem("localspot_auth", JSON.stringify({ token: "valid-token" }));
    apiClient.get.mockResolvedValueOnce({
      data: { id: "1", name: "Saved User", role: "user" }
    });
    apiClient.post.mockResolvedValueOnce({ data: { message: "Logged out" } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("user-name").textContent).toBe("Saved User"));

    await act(async () => {
      screen.getByText("Logout").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user-name").textContent).toBe("");
      expect(screen.getByTestId("token").textContent).toBe("");
      expect(localStorage.getItem("localspot_auth")).toBeNull();
    });
  });

  it("should register a new user", async () => {
    apiClient.post.mockResolvedValueOnce({
      data: { id: "2", name: "New User", email: "new@test.com", role: "user", token: "reg-token" }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.queryByText("Loading...")).toBeNull());

    act(() => {
      screen.getByText("Register").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("user-name").textContent).toBe("New User");
      expect(screen.getByTestId("token").textContent).toBe("reg-token");
      expect(JSON.parse(localStorage.getItem("localspot_auth")).token).toBe("reg-token");
    });
  });
});
