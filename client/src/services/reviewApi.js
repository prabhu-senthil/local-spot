import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const submitReview = async (reviewData, token) => {
  const res = await axios.post(`${API_URL}/api/reviews`, reviewData, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return res.data;
};
