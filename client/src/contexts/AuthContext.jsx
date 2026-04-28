import { createContext, useContext, useEffect, useMemo, useState } from "react";
import apiClient from "../services/apiClient";

const AuthContext = createContext(undefined);

const STORAGE_KEY = "localspot_auth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      if (parsed?.token) setToken(parsed.token);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setUser(null);
        return;
      }

      setLoading(true);
      try {
        const response = await apiClient.get("/auth/me");
        setUser(response.data);
        setError("");
      } catch (err) {
        // Interceptor handles 401 refresh, so if we're here, refresh likely failed
        setUser(null);
        setToken(null);
        setError(err.response?.data?.message || "Failed to fetch current user.");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  const register = async ({ name, email, password, role }) => {
    try {
      const response = await apiClient.post("/auth/register", { name, email, password, role });
      const data = response.data;

      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: data.token }));
      setToken(data.token);
      setUser({ id: data.id, name: data.name, email: data.email, role: data.role });
      setError("");
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed";
      setError(msg);
      throw new Error(msg);
    }
  };

  const login = async ({ email, password }) => {
    try {
      const response = await apiClient.post("/auth/login", { email, password });
      const data = response.data;

      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: data.token }));
      setToken(data.token);
      setUser({ id: data.id, name: data.name, email: data.email, role: data.role });
      setError("");
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed";
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (err) {
      console.error("Logout failed on server:", err);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem(STORAGE_KEY);
      setError("");
    }
  };

  const value = useMemo(
    () => ({ user, token, loading, error, setError, register, login, logout }),
    [user, token, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}

