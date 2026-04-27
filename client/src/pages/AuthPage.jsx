import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function LogoMark({ className = "h-10 w-10" }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white shadow-md ${className}`}
      aria-hidden
    >
      L
    </div>
  );
}

export function AuthPage() {
  const [mode, setMode] = useState("login");
  const navigate = useNavigate();

  const { login, register, error, setError } = useAuth();
  const [localError, setLocalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
  });

  const [availableRoles, setAvailableRoles] = useState([]);
  const [displayRoles, setDisplayRoles] = useState([]);

  useEffect(() => {
    if (mode === "register") {
      fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/register/init`)
        .then(res => res.json())
        .then(data => {
          if (data.roles) {
            setAvailableRoles(data.roles);
            setDisplayRoles(data.displayRoles || data.roles);
            setForm(prev => ({ ...prev, role: data.roles[0] || "user" }));
          }
        })
        .catch(err => console.error("Failed to fetch roles:", err));
    }
  }, [mode]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setLocalError("");
    setError("");

    if (!form.email || !form.password || (mode === "register" && !form.name)) {
      setLocalError("Please fill all required fields.");
      return;
    }

    if (mode === "register" && form.password !== form.confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      let userData;
      if (mode === "login") {
        userData = await login({ email: form.email, password: form.password });
      } else {
        userData = await register({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        });
      }

      if (userData.role === 'owner' || userData.role === 'admin') {
        navigate("/owner/dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setLocalError(err.message || "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="auth-shell flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel */}
      <aside className="relative flex flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-8 py-10 text-white lg:max-w-md lg:px-10">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-brand blur-3xl" />
          <div className="absolute -right-10 bottom-10 h-64 w-64 rounded-full bg-brand-light/40 blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Local discovery</p>
              <p className="text-xl font-bold tracking-tight">LocalSpot</p>
            </div>
          </div>
          <h1 className="mt-10 max-w-sm text-3xl font-bold leading-tight lg:text-4xl">
            Find great spots nearby—reviews you can trust.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/75">
            Join the community. Save favorites, write reviews, and discover restaurants, nightlife, and more in your
            area.
          </p>
        </div>
        <ul className="relative z-10 mt-10 grid gap-3 text-sm text-white/80 lg:mt-0">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs">
              ✓
            </span>
            Real ratings from locals
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs">
              ✓
            </span>
            Search by neighborhood & category
          </li>
        </ul>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="auth-glass w-full max-w-md rounded-2xl p-8 shadow-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {mode === "login" ? "Sign in to continue to your dashboard." : "It only takes a minute to get started."}
              </p>
            </div>
            <LogoMark className="h-11 w-11 lg:hidden" />
          </div>

          {/* Mode tabs */}
          <div className="mt-8 flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setLocalError("");
                setError("");
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setLocalError("");
                setError("");
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                mode === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Register
            </button>
          </div>

          {displayError && (
            <div
              className="mt-6 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
              role="alert"
            >
              {displayError}
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "register" && (
              <div>
                <label htmlFor="name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  autoComplete="name"
                  placeholder="Jane Doe"
                  value={form.name}
                  onChange={onChange}
                  className="input-field"
                />
              </div>
            )}

            {mode === "register" && availableRoles.length > 0 && (
              <div>
                <label htmlFor="role" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={form.role}
                  onChange={onChange}
                  className="input-field"
                >
                  {availableRoles.map((roleValue, index) => (
                    <option key={roleValue} value={roleValue}>
                      {displayRoles[index] || roleValue}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={onChange}
                className="input-field"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="••••••••"
                value={form.password}
                onChange={onChange}
                className="input-field"
              />
            </div>

            {mode === "register" && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={onChange}
                  className="input-field"
                />
              </div>
            )}

            <button disabled={submitting} type="submit" className="btn-primary mt-2">
              {submitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            {mode === "login" ? "New to LocalSpot?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode((m) => (m === "login" ? "register" : "login"));
                setLocalError("");
                setError("");
              }}
              className="font-semibold text-brand hover:text-brand-dark"
            >
              {mode === "login" ? "Create an account" : "Sign in instead"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
