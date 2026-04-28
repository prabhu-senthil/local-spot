import { useState } from "react";
import { Star } from "lucide-react";
import { submitReview } from "../services/reviewApi";
import PhotoUpload from "./PhotoUpload";

export default function ReviewForm({ venueId, onReviewSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [crowdLevel, setCrowdLevel] = useState("moderate");
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a rating.");
      return;
    }
    
    setIsSubmitting(true);
    setError("");

    try {
      const newReview = await submitReview({
        venueId,
        rating,
        reviewText,
        crowdLevel,
        images
      });
      
      setRating(0);
      setReviewText("");
      setCrowdLevel("moderate");
      setImages([]);
      if (onReviewSubmitted) {
        onReviewSubmitted(newReview);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mt-6">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Leave a Review</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                className="focus:outline-none transition-colors"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`w-6 h-6 ${
                    star <= (hoverRating || rating)
                      ? "text-orange-400 fill-current"
                      : "text-slate-200"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Crowd Level */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Crowd Level</label>
          <div className="flex gap-3">
            {["quiet", "moderate", "busy"].map((level) => (
              <label key={level} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="crowdLevel"
                  value={level}
                  checked={crowdLevel === level}
                  onChange={(e) => setCrowdLevel(e.target.value)}
                  className="text-brand focus:ring-brand"
                />
                <span className="text-sm text-slate-600 capitalize">{level}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Review Text */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Your Experience</label>
          <textarea
            rows="3"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-brand focus:border-brand text-sm"
            placeholder="What was it like?"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
          ></textarea>
        </div>

        {/* Photos */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Add Photos (Optional)</label>
          <PhotoUpload 
            onUploadComplete={(urls) => setImages(urls)} 
            maxPhotos={3} 
            currentPhotos={images}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Submitting..." : "Submit Review"}
        </button>
      </form>
    </div>
  );
}
