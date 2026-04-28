import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getOwnerDashboard } from "../services/analyticsApi";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid, Legend 
} from "recharts";
import { Store, Star, MessageSquare, Camera } from "lucide-react";
import PhotoUpload from "../components/PhotoUpload";
import apiClient from "../services/apiClient";

export default function AnalyticsDashboard() {
  const { token, user, logout } = useAuth();
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeModal, setActiveModal] = useState(null); // 'venues' or 'reviews'
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);

  useEffect(() => {
    if (!user) return;
    getOwnerDashboard()
      .then(setData)
      .catch((err) => setError(err.response?.data?.message || "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || (user.role !== "owner" && user.role !== "admin")) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">You must be an owner or admin to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center text-red-500">
          {error}
        </div>
      </div>
    );
  }

  // Fallback Logic for Hero Image
  let heroImage = "";
  if (user?.role === "owner" && data?.restaurantInfo) {
    if (data.restaurantInfo.image) {
      heroImage = data.restaurantInfo.image;
    } else if (data.restaurantInfo.category) {
      heroImage = data.restaurantInfo.category.toLowerCase().includes("coffee") || data.restaurantInfo.category.toLowerCase().includes("cafe")
        ? "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=1200"
        : "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200";
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Header - Aligned with Homepage */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-90">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-lg font-bold text-white shadow">
              L
            </div>
            <div className="hidden sm:block">
              <p className="text-lg font-bold tracking-tight text-slate-900">LocalSpot</p>
              <p className="text-xs text-slate-500">Discover local favorites</p>
            </div>
          </Link>

          <div className="flex-1"></div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <div className="flex items-center gap-2">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-900">{user?.name || "Guest"}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                {initials}
              </div>
              
              <Link
                to="/dashboard"
                className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Back to Map
              </Link>
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
      </header>

      {user?.role === "owner" && data?.restaurantInfo ? (
        <div className="relative h-64 md:h-80 w-full bg-brand overflow-hidden shrink-0">
          {heroImage ? (
            <img 
              src={heroImage} 
              alt={data.restaurantInfo.name} 
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-brand to-brand-dark" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
          
          <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 z-10 flex justify-between items-end">
            <div className="max-w-7xl mx-auto flex flex-col gap-2 w-full">
              <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-semibold uppercase tracking-wider w-fit">
                Owner Dashboard
              </span>
              <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">{data.restaurantInfo.name}</h1>
              <p className="text-white/90 text-sm md:text-base mt-1">
                {data.restaurantInfo.category ? `Overview and analytics for your ${data.restaurantInfo.category.toLowerCase()}.` : "Overview of your venues and analytics."}
              </p>
            </div>
            {user?.role === "owner" && data?.allVenues?.[0]?._id && (
              <button 
                onClick={() => setShowPhotoUpload(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-lg transition shrink-0"
              >
                <Camera className="w-4 h-4" />
                <span className="text-sm font-medium">Update Cover</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border-b border-slate-200 py-8 shrink-0">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <h1 className="text-3xl font-bold text-slate-800">Global Admin Dashboard</h1>
            <p className="text-slate-500 mt-2">Overview of all venues across the platform.</p>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        {/* STATS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-2">
          <div 
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition"
            onClick={() => setActiveModal("venues")}
          >
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Venues</p>
              <p className="text-2xl font-bold text-slate-800">{data?.overview?.totalVenues || 0}</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
              <Star className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Global Avg Rating</p>
              <p className="text-2xl font-bold text-slate-800">{data?.overview?.globalAvgRating || 0}</p>
            </div>
          </div>

          <div 
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition"
            onClick={() => setActiveModal("reviews")}
          >
            <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Reviews</p>
              <p className="text-2xl font-bold text-slate-800">{data?.overview?.totalReviews || 0}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* TOP VENUES CHART */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Top Venues (Rating)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.topVenues || []} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 40 }}>
                  <XAxis type="number" domain={[0, 5]} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="rating" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CROWD TRENDS CHART */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Crowd Trends (24h)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.crowdTrends || []} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="timeLabel" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="busyCount" name="Busy Reports" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="quietCount" name="Quiet Reports" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>

      {/* MODALS */}
      {activeModal === "venues" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">All Claimed Venues</h2>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {data?.allVenues?.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {data.allVenues.map((v) => (
                    <li key={v._id} className="py-4 first:pt-0 last:pb-0 flex justify-between items-center">
                      <div>
                        <Link to={`/venue/${v._id}`} className="font-semibold text-brand hover:underline">{v.name}</Link>
                        <p className="text-sm text-slate-500">{v.category} &bull; {v.address}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-700 flex items-center justify-end gap-1"><Star className="w-4 h-4 text-orange-400" /> {v.avgRating}</p>
                        <p className="text-xs text-slate-500">{v.reviewCount} reviews</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 text-center py-8">No venues claimed yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeModal === "reviews" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Recent Reviews</h2>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {data?.recentReviews?.length > 0 ? (
                <ul className="space-y-4">
                  {data.recentReviews.map((r) => (
                    <li key={r._id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-slate-800">{r.userName}</p>
                          <p className="text-xs text-slate-500">at <span className="font-medium text-slate-600">{r.venueName}</span> &bull; {new Date(r.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center text-orange-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "fill-current" : "text-slate-200"}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 mt-2">{r.text || "No comments."}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 text-center py-8">No reviews received yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showPhotoUpload && user?.role === "owner" && data?.allVenues?.[0]?._id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Update Cover Photo</h2>
              <button onClick={() => setShowPhotoUpload(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-sm text-slate-500 mb-4">
                Upload a high-quality image to represent {data.restaurantInfo.name}. This will be shown on your venue details page.
              </p>
              <PhotoUpload 
                maxPhotos={1}
                onUploadComplete={async (urls) => {
                  if (urls.length > 0) {
                    try {
                      await apiClient.put(
                        `/venues/${data.allVenues[0]._id}/image`,
                        { imageUrl: urls[0] }
                      );
                      // Update local state to reflect new image immediately
                      setData(prev => ({
                        ...prev,
                        restaurantInfo: { ...prev.restaurantInfo, image: urls[0] }
                      }));
                      setTimeout(() => setShowPhotoUpload(false), 1000);
                    } catch (err) {
                      console.error("Failed to save venue image", err);
                      alert("Image uploaded, but failed to save to venue.");
                    }
                  }
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
