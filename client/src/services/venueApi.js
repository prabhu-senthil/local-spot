import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const getVenueDetails = async(id)=>{

  const res = await axios.get(`${API_URL}/api/venues/${id}`);

  return res.data;
};

export const claimVenue = async (id, token) => {
  const res = await axios.post(`${API_URL}/api/venues/${id}/claim`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};
