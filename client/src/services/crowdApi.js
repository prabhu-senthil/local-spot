import apiClient from "./apiClient";

export const submitCrowdReport = async (venueId, status) => {
  const res = await apiClient.post("/crowd", { venueId, status });
  return res.data;
};
