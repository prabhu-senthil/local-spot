
import axios from "axios";

const GEOAPIFY_URL = "https://api.geoapify.com/v2/places";

export const searchRestaurants = async (query) => {
  const res = await axios.get(GEOAPIFY_URL, {
    params: {
      categories: "catering.restaurant",
      text: query,
      apiKey: import.meta.env.VITE_GEOAPIFY_KEY,
    },
  });

  return res.data.features;
};