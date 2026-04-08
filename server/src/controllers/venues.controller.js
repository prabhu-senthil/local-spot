const FSQ_BASE_URL = "https://api.foursquare.com/v3/places";
const DEFAULT_CATEGORY_ID = "13065"; // restaurants

function getFoursquareApiKey() {
  const key = process.env.FOURSQUARE_API_KEY;
  if (!key) {
    const err = new Error("Missing FOURSQUARE_API_KEY in server environment.");
    err.statusCode = 500;
    throw err;
  }
  return key;
}

function toFloat(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapVenue(v) {
  return {
    id: v.fsq_id,
    name: v.name,
    category: v.categories?.[0]?.name || "Restaurant",
    address: v.location?.formatted_address || "",
    latitude: v.geocodes?.main?.latitude ?? null,
    longitude: v.geocodes?.main?.longitude ?? null,
    distanceMeters: v.distance ?? null,
    distanceText: typeof v.distance === "number" ? `${(v.distance / 1000).toFixed(1)} km` : "",
    rating: typeof v.rating === "number" ? Number((v.rating / 2).toFixed(1)) : null,
    price: typeof v.price === "number" ? "$".repeat(v.price) : "",
    timezone: v.timezone || "",
  };
}

export async function getVenues(req, res, next) {
  try {
    const apiKey = getFoursquareApiKey();
    const lat = toFloat(req.query.lat, NaN);
    const lng = toFloat(req.query.lng, NaN);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: "Query params lat and lng are required numbers." });
    }

    const radius = Math.min(Math.max(toInt(req.query.radius, 4000), 500), 100000);
    const limit = Math.min(Math.max(toInt(req.query.limit, 20), 1), 50);
    const query = (req.query.query || "").toString().trim();
    const categoryId = (req.query.categoryId || DEFAULT_CATEGORY_ID).toString();

    const url = new URL(`${FSQ_BASE_URL}/search`);
    url.searchParams.set("ll", `${lat},${lng}`);
    url.searchParams.set("radius", String(radius));
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("categories", categoryId);
    url.searchParams.set("sort", "DISTANCE");
    url.searchParams.set("fields", "fsq_id,name,categories,location,geocodes,distance,rating,price,timezone");
    if (query) url.searchParams.set("query", query);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      const err = new Error(`Foursquare search failed: ${response.status} ${body}`);
      err.statusCode = 502;
      throw err;
    }

    const data = await response.json();
    const venues = Array.isArray(data.results) ? data.results.map(mapVenue) : [];
    return res.status(200).json(venues);
  } catch (err) {
    return next(err);
  }
}

export async function getVenueById(req, res, next) {
  try {
    const apiKey = getFoursquareApiKey();
    const url = new URL(`${FSQ_BASE_URL}/${req.params.id}`);
    url.searchParams.set(
      "fields",
      "fsq_id,name,categories,location,geocodes,distance,rating,price,website,tel,description,hours"
    );

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      const err = new Error(`Foursquare details failed: ${response.status} ${body}`);
      err.statusCode = 502;
      throw err;
    }

    const data = await response.json();
    return res.status(200).json({
      ...mapVenue(data),
      website: data.website || "",
      phone: data.tel || "",
      description: data.description || "",
      hours: data.hours || null,
    });
  } catch (err) {
    return next(err);
  }
}

