import axios from "axios";

export const getVenueDetails = async(id)=>{

  const res = await axios.get(`/api/venues/${id}`);

  return res.data;
};
