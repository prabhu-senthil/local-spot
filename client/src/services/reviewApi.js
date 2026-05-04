import apiClient from "./apiClient";

export const submitReview = async (reviewData) => {
  const res = await apiClient.post("/reviews", reviewData);
  return res.data;
};


export const voteOnReview = async (reviewId, voteType) => {
  const res = await apiClient.post(`/reviews/${reviewId}/vote`, { voteType });
  return res.data;
};

export const getReviewerTrustScore = async (userId) => {
  const res = await apiClient.get(`/users/${userId}/trust`);
  return res.data;
};

