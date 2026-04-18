import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(undefined);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
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
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Session expired. Please sign in again.");
        }

        const data = await response.json();
        setUser(data);
        setError("");
      } catch (err) {
        setUser(null);
        setToken(null);
        localStorage.removeItem(STORAGE_KEY);
        setError(err.message || "Failed to fetch current user.");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  const register = async ({ name, email, password, role }) => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Registration failed");
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: data.token }));
    setToken(data.token);
    setUser({ id: data.id, name: data.name, email: data.email, role: data.role });
    setError("");
    return data;
  };

  const login = async ({ email, password }) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: data.token }));
    setToken(data.token);
    setUser({ id: data.id, name: data.name, email: data.email, role: data.role });
    setError("");
    return data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
    setError("");
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

