import apiClient from "./apiClient";

/**
 * Admin API service for platform management.
 */

// --- User Management ---
export const getAllUsers = (params) => apiClient.get("/admin/users", { params });
export const updateUserStatus = (userId, status) => apiClient.patch(`/admin/users/${userId}/status`, { status });
export const updateUserRole = (userId, role) => apiClient.patch(`/admin/users/${userId}/role`, { role });
export const updateUserTrustScore = (userId, score) => apiClient.patch(`/admin/users/${userId}/trust-score`, { score });
export const resetUserPassword = (userId) => apiClient.post(`/admin/users/${userId}/reset-password`);

// --- Platform Stats ---
export const getPlatformStats = () => apiClient.get("/admin/stats");

// --- Review Moderation ---
export const getAllReviews = (params) => apiClient.get("/admin/reviews", { params });
export const deleteReview = (reviewId) => apiClient.delete(`/admin/reviews/${reviewId}`);
export const overrideReview = (reviewId) => apiClient.patch(`/admin/reviews/${reviewId}/override`);

// --- Crowd Insight Control ---
export const getAllCrowdReports = (params) => apiClient.get("/admin/crowd-reports", { params });
export const deleteCrowdReport = (reportId) => apiClient.delete(`/admin/crowd-reports/${reportId}`);
export const resetVenueCrowdData = (venueId) => apiClient.post(`/admin/venues/${venueId}/crowd-reset`);

// --- Venue Management ---
export const getAllAdminVenues = (params) => apiClient.get("/admin/venues", { params });
export const updateVenueApproval = (venueId, approvalStatus) => apiClient.patch(`/admin/venues/${venueId}/approval`, { approvalStatus });
export const updateVenueDetails = (venueId, updates) => apiClient.patch(`/admin/venues/${venueId}/details`, updates);
export const deleteVenue = (venueId) => apiClient.delete(`/admin/venues/${venueId}`);
export const mergeVenues = (sourceId, targetId) => apiClient.post("/admin/venues/merge", { sourceId, targetId });

// Legacy/Trust Metrics
export const getTrustMetrics = () => apiClient.get("/admin/trust-metrics");
export const getSuspiciousReviews = (params) => apiClient.get("/admin/suspicious-reviews", { params });
export const unblockReviewer = (userId) => apiClient.post(`/admin/users/${userId}/unblock`);
