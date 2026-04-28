import apiClient from "./apiClient";

export const getOwnerDashboard = async () => {
  const res = await apiClient.get("/analytics/dashboard");
  return res.data;
};
