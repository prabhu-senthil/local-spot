import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const getOwnerDashboard = async (token) => {
  const res = await axios.get(`${API_URL}/api/analytics/dashboard`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return res.data;
};
