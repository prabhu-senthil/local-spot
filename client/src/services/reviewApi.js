import apiClient from "./apiClient";

export const submitReview = async (reviewData) => {
  const res = await apiClient.post("/reviews", reviewData);
  return res.data;
};

/**
 * Vote on a review.
 * Returns { review, reviewer: { _id, reviewerTrustScore, status } }
 */
export const voteOnReview = async (reviewId, voteType) => {
  const res = await apiClient.post(`/reviews/${reviewId}/vote`, { voteType });
  return res.data;
};

/**
 * Fetch the latest trust score + status for a reviewer.
 * Used for optimistic UI updates after voting.
 */
export const getReviewerTrustScore = async (userId) => {
  const res = await apiClient.get(`/users/${userId}/trust`);
  return res.data; // { reviewerTrustScore, status }
};

