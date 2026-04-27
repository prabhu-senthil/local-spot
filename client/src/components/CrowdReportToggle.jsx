import { useState } from "react";
import { submitCrowdReport } from "../services/crowdApi";

export default function CrowdReportToggle({ venueId, token, onReportSubmitted }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleReport = async (status) => {
    setIsSubmitting(true);
    setError("");

    try {
      await submitCrowdReport(venueId, status, token);
      if (onReportSubmitted) {
        onReportSubmitted(status);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit crowd report.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          Quiet
        </button>
        <button
          onClick={() => handleReport("busy")}
          disabled={isSubmitting}
          className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          Busy
        </button>
      </div>
    </div>
  );
}
