const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function buildVenuesUrl({ lat, lng, query, category, radius, limit }) {
  const url = new URL(`${API_URL}/api/venues`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lng", String(lng));
  url.searchParams.set("radius", String(radius));
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("category", category);
  if (query.trim()) url.searchParams.set("query", query.trim());
  return url;
}

/**
 * Nearby place search via your Express API (Geoapify key stays on the server).
 * @param {object} params
 * @param {number} params.lat
 * @param {number} params.lng
 * @param {string} [params.query] - Sent to Geoapify Places as `name` / name filter (e.g. pizza, ramen).
 * @param {string} [params.category] - One of: restaurants, nightlife, shopping, services, coffee, outdoors.
 * @param {number} [params.radius]
 * @param {number} [params.limit]
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<Array>} Normalized venue objects from the backend.
 */
export async function searchNearbyVenues({
  lat,
  lng,
  query = "",
  category = "restaurants",
  radius = 4000,
  limit = 20,
  signal,
}) {
  const url = buildVenuesUrl({ lat, lng, query, category, radius, limit });
  const res = await fetch(url, { signal });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || res.statusText || "Venue search failed");
    err.status = res.status;
    throw err;
  }
  return Array.isArray(data) ? data : [];
}

/** @deprecated Use {@link searchNearbyVenues}; do not call Geoapify from the browser. */
export const searchRestaurants = searchNearbyVenues;
