import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getVenueDetails } from "../services/venueApi";
import { 
  ArrowLeft, MapPin, Star, Clock, AlertCircle, 
  Users, Activity, ShieldCheck, CheckCircle2
} from "lucide-react";
import ReviewForm from "./ReviewForm";
import CrowdReportToggle from "./CrowdReportToggle";
import { useAuth } from "../contexts/AuthContext";
import { claimVenue } from "../services/venueApi";

export default function VenueDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    const fetchVenue = async () => {
      try {
        const data = await getVenueDetails(id);
        setVenue(data);
      } catch (err) {
        setError("Venue not found");
      }
      setLoading(false);
    };
    fetchVenue();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand" />
          <p className="text-slate-500 font-medium">Loading venue details...</p>
        </div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center border border-slate-100">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Oops!</h2>
          <p className="text-slate-600 mb-6">{error || "We couldn't find that venue."}</p>
          <button 
            onClick={() => navigate(-1)}
            className="btn-primary w-full flex justify-center items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  // Fallback Logic
  let heroImage = "";
  if (venue.images?.length > 0) {
    heroImage = venue.images[0];
  } else if (venue.category) {
    // Unsplash source is deprecated, so we use a reliable generic cafe/restaurant image as a fallback
    // In a real app, you would integrate Unsplash API to search by category
    heroImage = venue.category.toLowerCase().includes("coffee") || venue.category.toLowerCase().includes("cafe")
      ? "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=1200"
      : "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200";
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Hero Section */}
      <div className="relative h-72 md:h-96 w-full bg-brand overflow-hidden">
        {heroImage ? (
          <img 
            src={heroImage} 
            alt={venue.name} 
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand to-brand-dark" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
        
        {/* Top Nav */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 z-10">
          <div className="max-w-5xl mx-auto flex flex-col gap-2">
            <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-semibold uppercase tracking-wider w-fit">
              {venue.category}
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">{venue.name}</h1>
            <div className="flex items-center gap-2 text-white/90 text-sm md:text-base mt-1">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{venue.address || "Location unavailable"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-6 relative z-20">
        
        {/* Quick Stats Bar */}
        <div className="bg-white rounded-2xl shadow-card p-6 flex flex-wrap md:flex-nowrap gap-6 md:gap-12 items-center justify-between md:justify-start border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-orange-50 text-orange-500">
              <Star className="w-6 h-6 fill-current" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 leading-none">
                {venue.avgRating ? venue.avgRating.toFixed(1) : "New"}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {venue.reviewCount || 0} REVIEWS
              </p>
            </div>
          </div>
          
          <div className="w-px h-12 bg-slate-100 hidden md:block"></div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-50 text-green-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 leading-none">
                {venue.trustScore || "TBD"}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                TRUST SCORE
              </p>
            </div>
          </div>
        </div>

        {user?.role === "restaurant_owner" && !venue.ownerId && (
          <div className="mt-6">
            <button 
              onClick={async () => {
                try {
                  setClaiming(true);
                  const res = await claimVenue(id, token);
                  setVenue((prev) => ({ ...prev, ownerId: res.venue.ownerId }));
                } catch (err) {
                  alert(err.response?.data?.message || "Failed to claim venue");
                } finally {
                  setClaiming(false);
                }
              }}
              disabled={claiming}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-5 w-5" />
              {claiming ? "Claiming..." : "Claim this Venue as Owner"}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
          
          {/* Main Content (Left Column) */}
          <div className="md:col-span-2 space-y-8">
            
            {/* Tags */}
            {venue.tags && venue.tags.length > 0 && (
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Vibes & Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {venue.tags.map(tag => (
                    <span key={tag} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium border border-slate-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Reviews */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800">Community Reviews</h3>
              </div>

              {venue.reviews?.length > 0 ? (
                <div className="space-y-4">
                  {venue.reviews.map((r) => (
                    <div key={r._id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-light text-brand font-bold uppercase">
                          {r.userId?.name ? r.userId.name[0] : "U"}
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-3.5 h-3.5 ${i < r.rating ? "text-orange-400 fill-current" : "text-slate-200"}`} 
                              />
                            ))}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">Verified Visit</p>
                        </div>
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed">{r.reviewText || "No comment provided."}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 border-dashed">
                  <p className="text-slate-500 font-medium mb-1">No reviews yet</p>
                  <p className="text-slate-400 text-sm">Be the first to share your experience!</p>
                </div>
              )}

              {user ? (
                <ReviewForm 
                  venueId={venue._id} 
                  token={token} 
                  onReviewSubmitted={(newReview) => {
                    setVenue(prev => ({
                      ...prev,
                      reviews: [newReview, ...(prev.reviews || [])],
                      reviewCount: (prev.reviewCount || 0) + 1
                    }));
                  }}
                />
              ) : (
                <div className="mt-6 p-4 bg-slate-100 rounded-xl text-center text-sm text-slate-600">
                  <p>Please log in to leave a review.</p>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar (Right Column) */}
          <div className="space-y-8">
            
            {/* Opening Hours */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-6">
                <Clock className="w-5 h-5 text-brand" />
                <h3 className="text-lg font-bold text-slate-800">Opening Hours</h3>
              </div>
              
              {venue.openingHours ? (
                <ul className="space-y-3">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                    const hours = venue.openingHours[day];
                    const isClosed = !hours || (!hours.open && !hours.close);
                    return (
                      <li key={day} className="flex justify-between items-center text-sm">
                        <span className="capitalize text-slate-500 font-medium">{day}</span>
                        <span className={`font-semibold ${isClosed ? "text-slate-400" : "text-slate-800"}`}>
                          {isClosed ? "Closed" : `${hours.open} - ${hours.close}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-slate-500 text-sm italic">Hours not available</p>
              )}
            </section>

            {/* Crowd Insights */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="w-5 h-5 text-brand" />
                <h3 className="text-lg font-bold text-slate-800">Crowd Insights</h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Busy Reports</p>
                    <p className="text-2xl font-bold text-slate-800">{venue.crowd?.busy || 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className="bg-red-400 h-2 rounded-full" 
                    style={{ width: `${Math.min(100, (venue.crowd?.busy || 0) * 10)}%` }}
                  ></div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Quiet Reports</p>
                    <p className="text-2xl font-bold text-slate-800">{venue.crowd?.quiet || 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className="bg-blue-400 h-2 rounded-full" 
                    style={{ width: `${Math.min(100, (venue.crowd?.quiet || 0) * 10)}%` }}
                  ></div>
                </div>
              </div>

              {user ? (
                <CrowdReportToggle 
                  venueId={venue._id} 
                  token={token} 
                  onReportSubmitted={(status) => {
                    setVenue((prev) => ({
                      ...prev,
                      crowd: {
                        ...prev.crowd,
                        [status]: (prev.crowd?.[status] || 0) + 1
                      }
                    }));
                  }}
                />
              ) : (
                <div className="mt-4 pt-4 border-t border-slate-100 text-center text-sm text-slate-500">
                  Log in to report crowd levels
                </div>
              )}
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
