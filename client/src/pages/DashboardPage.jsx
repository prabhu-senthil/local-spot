import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../services/apiClient";


const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "";
const CATEGORY_MAP = {
  restaurants: "13065",
  nightlife: "13003",
  shopping: "17000",
  coffee: "13032",
  services: "17100",
  outdoors: "16000",
};

const CATEGORIES = [
  { id: "restaurants", label: "Restaurants", icon: "🍽️" },
  { id: "nightlife", label: "Nightlife", icon: "🍸" },
  { id: "shopping", label: "Shopping", icon: "🛍️" },
  { id: "services", label: "Services", icon: "💇" },
  { id: "coffee", label: "Coffee & Tea", icon: "☕" },
  { id: "outdoors", label: "Parks", icon: "🌳" },
];

const MOCK_REVIEWS = [
  {
    id: "r1",
    user: "Alex M.",
    venue: "Harbor Bistro",
    stars: 5,
    text: "Best clam chowder in the city. Sat on the patio—perfect sunset.",
    time: "2 days ago",
  },
  {
    id: "r2",
    user: "Sam K.",
    venue: "Neon Noodle Bar",
    stars: 4,
    text: "Long wait on Friday but worth it. Try the spicy miso ramen.",
    time: "1 week ago",
  },
];

function StarRow({ value, size = "sm" }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const starClass = size === "sm" ? "text-sm" : "text-base";
  return (
    <span className={`inline-flex items-center gap-0.5 text-amber-500 ${starClass}`} aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: full }).map((_, i) => (
        <span key={`f-${i}`}>★</span>
      ))}
      {half && <span>½</span>}
      {Array.from({ length: 5 - full - (half ? 1 : 0) }).map((_, i) => (
        <span key={`e-${i}`} className="text-slate-300">
          ★
        </span>
      ))}
    </span>
  );
}

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [activeCategory, setActiveCategory] = useState("restaurants");
  const [coords, setCoords] = useState(null);
  const [venues, setVenues] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const initials = useMemo(
    () =>
      (user?.name || "U")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [user?.name]
  );

  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setError("");
        setLocating(false);
      },
      (geoError) => {
        setError(geoError?.message || "Could not access your location.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  useEffect(() => {
    if (!coords || !MAPBOX_TOKEN) return;
    const controller = new AbortController();
    const loadPlaceName = async () => {
      try {
        const geocodeUrl = new URL(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json`
        );
        geocodeUrl.searchParams.set("access_token", MAPBOX_TOKEN);
        geocodeUrl.searchParams.set("types", "place,locality,region");
        geocodeUrl.searchParams.set("limit", "1");
        const response = await fetch(geocodeUrl, { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        setLocation(data.features?.[0]?.place_name || "");
      } catch {
        // ignore reverse geocode errors
      }
    };
    loadPlaceName();
    return () => controller.abort();
  }, [coords]);

  useEffect(() => {
    if (!coords) return;
    const controller = new AbortController();
    const loadVenues = async () => {
      setVenuesLoading(true);
      setError("");
      try {
        const response = await apiClient.get("/venues", {
          params: {
            lat: coords.lat,
            lng: coords.lng,
            radius: 4000,
            limit: 20,
            categoryId: CATEGORY_MAP[activeCategory] || "13065",
            query: search.trim() || undefined
          },
          signal: controller.signal
        });
        const data = response.data;
        setVenues(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load venues.");
          setVenues([]);
        }
      } finally {
        setVenuesLoading(false);
      }
    };
    loadVenues();
    return () => controller.abort();
  }, [coords, activeCategory, search]);

  useEffect(() => {
    if (!coords || !MAPBOX_TOKEN || !mapContainerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [coords.lng, coords.lat],
      zoom: 13,
    });
    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [coords]);

  useEffect(() => {
    if (!mapRef.current || !coords) return;
    mapRef.current.setCenter([coords.lng, coords.lat]);
  }, [coords]);

  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    venues.forEach((v) => {
      if (typeof v.longitude !== "number" || typeof v.latitude !== "number") return;
      const marker = new mapboxgl.Marker({ color: "#d32323" })
        .setLngLat([v.longitude, v.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 12 }).setHTML(
            `<strong>${v.name}</strong><br/><span>${v.address || ""}</span>`
          )
        )
        .addTo(mapRef.current);
      markersRef.current.push(marker);
    });
  }, [venues]);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top bar — Yelp-style search + nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-lg font-bold text-white shadow">
              L
            </div>
            <div className="hidden sm:block">
              <p className="text-lg font-bold tracking-tight text-slate-900">LocalSpot</p>
              <p className="text-xs text-slate-500">Discover local favorites</p>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="tacos, cheap dinner, date night…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={location}
                readOnly
                placeholder="Detecting location..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <button
              type="button"
              onClick={fetchCurrentLocation}
              className="shrink-0 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/40"
            >
              {locating ? "Locating..." : "Use my location"}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <button
              type="button"
              className="hidden rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 md:inline-flex"
              aria-label="Notifications"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-900">{user?.name || "Guest"}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                {initials}
              </div>
              {user?.role === "admin" && (
                <Link
                  to="/owner/dashboard"
                  className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                >
                  Global Dashboard
                </Link>
              )}
              {user?.role === "owner" && (
                <Link
                  to="/owner/dashboard"
                  className="rounded-lg bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100"
                >
                  My Dashboard
                </Link>
              )}
              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Log out
              </button>
            </div>
          </div>
        </div>

        {/* Category pills */}
        <div className="border-t border-slate-100 bg-slate-50/80">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(c.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${activeCategory === c.id
                  ? "bg-slate-900 text-white shadow"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                  }`}
              >
                <span aria-hidden>{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">The best {CATEGORIES.find((c) => c.id === activeCategory)?.label.toLowerCase() || "places"} near you</h1>
            <p className="mt-1 text-sm text-slate-600">
              {location
                ? `Showing places around ${location}`
                : "Use your exact location to load nearby venues."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
              Open now
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
              Top rated
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
              Delivery
            </span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Main column: filters + list */}
          <div className="space-y-4">
            <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quick filters</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["$$", "$$$", "Outdoor seating", "Good for groups", "Takes reservations"].map((f) => (
                  <button
                    key={f}
                    type="button"
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-brand/40 hover:bg-white"
                  >
                    {f}
                  </button>
                ))}
              </div>
            </aside>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {venuesLoading && <p className="text-sm text-slate-500">Loading nearby venues...</p>}
            <ul className="space-y-4">
              {!venuesLoading && venues.length === 0 && (
                <li className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-card">
                  No venues found for this location/filter.
                </li>
              )}
              {venues.map((v) => (
                <li key={v.id}>
                  <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition hover:shadow-lift">
                    <div className="flex">
                      <div className="flex flex-1 flex-col p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            {/* <h2 className="text-lg font-bold text-slate-900 hover:text-brand cursor-pointer">{v.name}</h2> */}
                            <h2
                              className="text-lg font-bold text-slate-900 hover:text-blue-600 cursor-pointer"
                              onClick={() => {
                                if (v._id) {
                                  navigate(`/venue/${v._id}`);
                                } else {
                                  alert("Details not available for this venue yet");
                                }
                              }}
                            >
                              {v.name}
                            </h2>
                            <p className="text-sm text-slate-600">{v.category}</p>
                            {v.address && <p className="mt-1 text-xs text-slate-500">{v.address}</p>}
                          </div>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {v.distanceText || "--"}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                          {typeof v.rating === "number" ? (
                            <>
                              <StarRow value={v.rating} />
                              <span className="text-slate-600">{v.rating.toFixed(1)} / 5</span>
                            </>
                          ) : (
                            <span className="text-slate-400">No rating yet</span>
                          )}
                          {v.price && (
                            <>
                              <span className="text-slate-400">·</span>
                              <span className="font-medium text-slate-700">{v.price}</span>
                            </>
                          )}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
                            onClick={() => {
                              if (mapRef.current && typeof v.longitude === "number" && typeof v.latitude === "number") {
                                mapRef.current.flyTo({ center: [v.longitude, v.latitude], zoom: 20 });
                              }
                            }}
                          >
                            View on map
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>

            {/* Recent activity */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
              <h3 className="text-base font-bold text-slate-900">Recent reviews</h3>
              <p className="mt-1 text-sm text-slate-600">Activity from people near {location}</p>
              <ul className="mt-4 divide-y divide-slate-100">
                {MOCK_REVIEWS.map((r) => (
                  <li key={r.id} className="py-4 first:pt-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{r.user}</p>
                        <p className="text-xs text-slate-500">{r.venue}</p>
                      </div>
                      <StarRow value={r.stars} />
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{r.text}</p>
                    <p className="mt-2 text-xs text-slate-400">{r.time}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Map column — Yelp-style sticky map */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
              {MAPBOX_TOKEN ? (
                <div ref={mapContainerRef} className="h-[420px] w-full" />
              ) : (
                <div className="p-4 text-sm text-amber-700">
                  Missing <code>VITE_MAPBOX_ACCESS_TOKEN</code>. Add it in your client env file.
                </div>
              )}
              <div className="border-t border-slate-100 p-3">
                <p className="text-center text-xs text-slate-500">Showing results near {location}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
