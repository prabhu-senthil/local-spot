import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const CATEGORIES = [
  { id: "restaurants", label: "Restaurants", icon: "🍽️" },
  { id: "nightlife", label: "Nightlife", icon: "🍸" },
  { id: "shopping", label: "Shopping", icon: "🛍️" },
  { id: "services", label: "Services", icon: "💇" },
  { id: "coffee", label: "Coffee & Tea", icon: "☕" },
  { id: "outdoors", label: "Parks", icon: "🌳" },
];

const MOCK_VENUES = [
  {
    id: "1",
    name: "Harbor Bistro",
    category: "Seafood · Downtown",
    rating: 4.5,
    reviews: 428,
    price: "$$",
    open: true,
    distance: "0.3 mi",
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=260&fit=crop",
  },
  {
    id: "2",
    name: "Neon Noodle Bar",
    category: "Asian Fusion · Arts District",
    rating: 4.7,
    reviews: 891,
    price: "$$",
    open: true,
    distance: "0.8 mi",
    image:
      "https://images.unsplash.com/photo-1552566626-52f8dd828a9c?w=400&h=260&fit=crop",
  },
  {
    id: "3",
    name: "Copper Oak Tavern",
    category: "American · Old Town",
    rating: 4.2,
    reviews: 203,
    price: "$$$",
    open: false,
    distance: "1.1 mi",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=260&fit=crop",
  },
  {
    id: "4",
    name: "Velvet Lounge",
    category: "Cocktail Bar · Waterfront",
    rating: 4.6,
    reviews: 312,
    price: "$$$",
    open: true,
    distance: "1.4 mi",
    image:
      "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400&h=260&fit=crop",
  },
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
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("San Francisco, CA");
  const [activeCategory, setActiveCategory] = useState("restaurants");

  const initials = (user?.name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, neighborhood, or ZIP"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/40"
            >
              Search
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
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  activeCategory === c.id
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
              Browse reviews, photos, and hours—styled like a local discovery feed.
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

            <ul className="space-y-4">
              {MOCK_VENUES.map((v) => (
                <li key={v.id}>
                  <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition hover:shadow-lift">
                    <div className="flex flex-col sm:flex-row">
                      <div className="relative h-44 shrink-0 sm:h-auto sm:w-52">
                        <img src={v.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                        <button
                          type="button"
                          className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-slate-600 shadow hover:text-brand"
                          aria-label="Save"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h2 className="text-lg font-bold text-slate-900 hover:text-brand cursor-pointer">{v.name}</h2>
                            <p className="text-sm text-slate-600">{v.category}</p>
                          </div>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {v.distance}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                          <StarRow value={v.rating} />
                          <span className="text-slate-600">
                            {v.rating} ({v.reviews} reviews)
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="font-medium text-slate-700">{v.price}</span>
                          <span className="text-slate-400">·</span>
                          <span className={v.open ? "font-medium text-emerald-600" : "font-medium text-amber-600"}>
                            {v.open ? "Open now" : "Closed"}
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
                          >
                            View details
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Write a review
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
              <div className="map-placeholder relative aspect-[4/3] w-full lg:aspect-auto lg:min-h-[420px]">
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <div className="rounded-full bg-white/90 p-3 shadow-md">
                    <svg className="h-8 w-8 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                      />
                    </svg>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-700">Map view</p>
                  <p className="mt-1 max-w-[220px] text-xs text-slate-500">
                    Pin your search results here. Wire this panel to Mapbox or your venues API when ready.
                  </p>
                </div>
                {/* Fake pins */}
                <span className="absolute left-[28%] top-[35%] flex h-8 w-8 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full bg-brand text-white shadow-lg ring-2 ring-white">
                  <span className="text-xs font-bold">1</span>
                </span>
                <span className="absolute left-[55%] top-[48%] flex h-8 w-8 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full bg-slate-800 text-white shadow-lg ring-2 ring-white">
                  <span className="text-xs font-bold">2</span>
                </span>
                <span className="absolute left-[72%] top-[40%] flex h-8 w-8 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full bg-slate-800 text-white shadow-lg ring-2 ring-white">
                  <span className="text-xs font-bold">3</span>
                </span>
              </div>
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
