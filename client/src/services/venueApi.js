import apiClient from "./apiClient";

export const getVenueDetails = async (id) => {
  const res = await apiClient.get(`/venues/${id}`);
  return res.data;
};

export const claimVenue = async (id) => {
  const res = await apiClient.post(`/venues/${id}/claim`);
  return res.data;
};

export const resendClaimOTP = async (id) => {
  const res = await apiClient.post(`/venues/${id}/claim/resend`);
  return res.data;
};

export const verifyClaimOTP = async (id, otp) => {
  const res = await apiClient.post(`/venues/${id}/claim/verify`, { otp });
  return res.data;
};
