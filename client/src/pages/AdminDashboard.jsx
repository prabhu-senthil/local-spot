import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import * as adminApi from "../services/adminApi";
import {
  Users, MessageSquare, MapPin, Activity,
  Shield, ShieldAlert, Trash2, CheckCircle,
  XCircle, Filter, RotateCcw, GitMerge,
  Search, ExternalLink, MoreVertical, PieChart as PieIcon, BarChart as BarIcon, TrendingUp
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  AreaChart, Area
} from "recharts";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("users"); // Default to Users
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [venueSort, setVenueSort] = useState("name");

  const tabs = [
    { id: "users", label: "Users", icon: Users },
    { id: "reviews", label: "Reviews", icon: MessageSquare },
    { id: "venues", label: "Venues", icon: MapPin },
    { id: "stats", label: "Platform Stats", icon: TrendingUp },
  ];

  useEffect(() => {
    fetchData();
  }, [activeTab, venueSort]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      let res;
      if (activeTab === "stats") {
        res = await adminApi.getPlatformStats();
        setStats(res.data);
        return;
      }
      else if (activeTab === "users") res = await adminApi.getAllUsers();
      else if (activeTab === "reviews") res = await adminApi.getAllReviews();
      else if (activeTab === "venues") {
        res = await adminApi.getAllAdminVenues({ sort: venueSort });
      }

      setData(res.data.reviews || res.data);
    } catch (err) {
      setError("Failed to fetch data for " + activeTab);
    } finally {
      setLoading(false);
    }
  };

  const handleTrustUpdate = async (userId, score) => {
    try {
      await adminApi.updateUserTrustScore(userId, score);
      setSuccess("Trust score adjusted.");
      fetchData();
    } catch (err) {
      setError("Failed to adjust trust score.");
    }
  };

  const handleStatusUpdate = async (userId, status) => {
    try {
      await adminApi.updateUserStatus(userId, status);
      setSuccess("User status updated.");
      fetchData();
    } catch (err) {
      setError("Failed to update status.");
    }
  };

  const handleRoleUpdate = async (userId, role) => {
    try {
      await adminApi.updateUserRole(userId, role);
      setSuccess("User role updated.");
      fetchData();
    } catch (err) {
      setError("Failed to update role.");
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-xl font-bold text-slate-900">Access Denied</h2>
          <p className="mt-2 text-slate-500">You do not have permission to view this page.</p>
          <Link to="/dashboard" className="mt-6 inline-block text-brand hover:underline font-medium">Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-xl font-bold text-white shadow">
              A
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Admin Control Centre</h1>
              <p className="text-xs text-slate-500">Platform-wide management & moderation</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900">Back to Map</Link>
            <button onClick={logout} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Log out</button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl flex-1 flex flex-col p-6">
        {success && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <div className="flex items-center gap-2"><CheckCircle size={16} /> {success}</div>
            <button onClick={() => setSuccess("")} className="font-bold">&times;</button>
          </div>
        )}
        {error && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="flex items-center gap-2"><ShieldAlert size={16} /> {error}</div>
            <button onClick={() => setError("")} className="font-bold">&times;</button>
          </div>
        )}

        <div className="mb-8 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all rounded-t-xl ${activeTab === t.id
                    ? "bg-white border-x border-t border-slate-200 text-slate-900 -mb-[9px] relative z-10"
                    : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                <Icon size={18} />
                {t.label}
              </button>
            );
          })}
        </div>


        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">

          <div className="p-4 border-b border-slate-100 flex items-center justify-end bg-slate-50/50">
            <button onClick={fetchData} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition uppercase tracking-wider">
              <RotateCcw size={14} /> Refresh Data
            </button>
          </div>

          {activeTab === "venues" && (
            <div className="p-4 border-b border-slate-100 flex gap-4 items-center bg-white">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sort By:</span>
                <select
                  value={venueSort}
                  onChange={(e) => setVenueSort(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-3 text-xs font-bold text-slate-700 focus:border-brand focus:outline-none"
                >
                  <option value="name">Name (A-Z)</option>
                  <option value="-name">Name (Z-A)</option>
                  <option value="approvalStatus">Status (A-Z)</option>
                  <option value="ownerName">Owner Name (A-Z)</option>
                </select>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand"></div>
              </div>
            ) : (
              <div className="min-w-full divide-y divide-slate-100">
                {activeTab === "stats" && stats && (
                  <div className="p-6 bg-slate-50/30 flex-1 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Users</p>
                          <h3 className="text-3xl font-black text-slate-900">{stats.overview.totalUsers}</h3>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                          <Users size={24} />
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Reviews</p>
                          <h3 className="text-3xl font-black text-slate-900">{stats.overview.totalReviews}</h3>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                          <MessageSquare size={24} />
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Venues</p>
                          <h3 className="text-3xl font-black text-slate-900">{stats.overview.totalVenues}</h3>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                          <MapPin size={24} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h4 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                          <PieIcon size={16} className="text-brand" /> Content Authenticity
                        </h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={stats.reviewStats.map(s => ({ name: s._id || "genuine", value: s.count }))}
                                cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                              >
                                {stats.reviewStats.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry._id === "genuine" ? "#10b981" : entry._id === "highly_suspicious" ? "#ef4444" : "#f59e0b"} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h4 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                          <BarIcon size={16} className="text-indigo-600" /> Top Performing Venues
                        </h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.topVenues}>
                              <XAxis dataKey="name" hide />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="reviewCount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "users" && (
                  <table className="min-w-full table-auto text-left">
                    <thead>
                      <tr className="bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {data.map((u) => (
                        <tr key={u._id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                {u.name ? u.name[0].toUpperCase() : "U"}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{u.name || "Unknown"}</p>
                                <p className="text-xs text-slate-500">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleUpdate(u._id, e.target.value)}
                              className="rounded border border-slate-200 bg-transparent py-1 px-2 text-xs font-semibold"
                            >
                              {["user", "reviewer", "owner", "admin"].map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex w-fit px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${u.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{u.status}</span>
                              <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-slate-400">
                                Trust: <input type="number" defaultValue={u.reviewerTrustScore} onBlur={(e) => handleTrustUpdate(u._id, e.target.value)} className="w-10 border-b border-slate-200 outline-none" />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {u.status === "blocked" ? (
                                <button onClick={() => handleStatusUpdate(u._id, "active")} className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition shadow-sm">Unblock</button>
                              ) : (
                                <button onClick={() => handleStatusUpdate(u._id, "blocked")} className="px-3 py-1 text-xs font-bold rounded-lg bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-slate-200 transition shadow-sm">Block</button>
                              )}
                              <button onClick={() => adminApi.resetUserPassword(u._id).then(() => setSuccess(`Reset ${u.email}`))} className="p-2 text-slate-400 hover:text-slate-900"><RotateCcw size={18} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === "reviews" && (
                  <div className="p-6 space-y-4">
                    {data.map((r) => (
                      <div key={r._id} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-400 mb-1">{r.userId?.name} @ {r.venueId?.name}</p>
                          <p className="text-sm text-slate-700 italic">"{r.reviewText}"</p>
                          <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">⭐ {r.rating}/5 &bull; {r.isSuspicious ? "🚩 Flagged" : "✅ OK"}</p>
                        </div>
                        <div className="flex gap-2">
                          {r.isSuspicious && <button onClick={() => adminApi.overrideReview(r._id).then(() => fetchData())} className="px-3 py-1.5 bg-emerald-500 text-white text-[10px] font-bold rounded-lg uppercase">Approve</button>}
                          <button onClick={() => adminApi.deleteReview(r._id).then(() => fetchData())} className="px-3 py-1.5 bg-red-50 text-red-500 text-[10px] font-bold rounded-lg uppercase border border-red-100">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "venues" && (
                  <table className="min-w-full table-auto text-left">
                    <thead>
                      <tr className="bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-4">Venue</th>
                        <th className="px-6 py-4">Owner</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {data.map((v) => (
                        <tr key={v._id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900">{v.name}</p>
                            <p className="text-xs text-slate-500">{v.category}</p>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-600">{v.ownerId?.name || "Unclaimed"}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${v.approvalStatus === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{v.approvalStatus || "approved"}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {v.approvalStatus === "pending" && <button onClick={() => adminApi.updateVenueApproval(v._id, "approved").then(() => fetchData())} className="p-2 text-emerald-500"><CheckCircle size={18} /></button>}
                              <button onClick={() => adminApi.deleteVenue(v._id).then(() => fetchData())} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
