import { useState, useEffect } from "react";
import { submitCrowdReport } from "../services/crowdApi";

const STORAGE_KEY = (venueId) => `crowdReport_${venueId}`;

function isWithinSameHour(isoTimestamp) {
  if (!isoTimestamp) return false;
  const submitted = new Date(isoTimestamp);
  const startOfHour = new Date();
  startOfHour.setMinutes(0, 0, 0);
  return submitted >= startOfHour;
}

function nextHourLabel() {
  const next = new Date();
  next.setHours(next.getHours() + 1, 0, 0, 0);
  return next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function CrowdReportToggle({ venueId, onReportSubmitted }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [lockedUntil, setLockedUntil] = useState(null); // ISO string of next-allowed time

  // On mount: check if user already reported this venue this hour
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY(venueId));
    if (stored && isWithinSameHour(stored)) {
      setLockedUntil(stored);
    } else {
      // Clear stale entry from previous hour
      localStorage.removeItem(STORAGE_KEY(venueId));
      setLockedUntil(null);
    }
  }, [venueId]);

  const handleReport = async (status) => {
    setIsSubmitting(true);
    setError("");

    try {
      await submitCrowdReport(venueId, status);
      // Lock UI and persist to localStorage
      const now = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY(venueId), now);
      setLockedUntil(now);
      if (onReportSubmitted) onReportSubmitted(status);
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 429 && data?.nextAllowedAt) {
        // Server says duplicate — lock UI using server's nextAllowedAt
        const now = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY(venueId), now);
        setLockedUntil(now);
        setError(""); // suppress error — the locked UI is self-explanatory
      } else {
        setError(data?.message || "Failed to submit crowd report.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Locked state (already reported this hour) ─────────────────────────────
  if (lockedUntil && isWithinSameHour(lockedUntil)) {
    return (
      <div className="mt-4 pt-4 border-t border-slate-100">
        <p className="text-sm font-semibold text-slate-800 mb-2">How is it right now?</p>
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-green-600 text-sm">✓</span>
          <span className="text-sm text-green-700 font-medium">
            Thanks! You can report again after {nextHourLabel()}.
          </span>
        </div>
      </div>
    );
  }

  // ── Normal state ──────────────────────────────────────────────────────────
  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <p className="text-sm font-semibold text-slate-800 mb-2">How is it right now?</p>

      {error && (
        <p className="text-xs text-red-500 mb-2">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => handleReport("quiet")}
          disabled={isSubmitting}
          className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "…" : "Quiet"}
        </button>
        <button
          onClick={() => handleReport("busy")}
          disabled={isSubmitting}
          className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "…" : "Busy"}
        </button>
      </div>
    </div>
  );
}
