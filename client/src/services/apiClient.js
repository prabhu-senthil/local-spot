import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true, // Crucial for sending cookies
});

// Request Interceptor: Attach Access Token
apiClient.interceptors.request.use(
  (config) => {
    const authData = JSON.parse(localStorage.getItem("localspot_auth"));
    if (authData?.token) {
      config.headers.Authorization = `Bearer ${authData.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 and Refresh Token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying, and NOT an auth route
    const isAuthRoute = originalRequest.url.includes("/auth/login") || originalRequest.url.includes("/auth/refresh");
    
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token
        const res = await axios.post(`${API_URL}/api/auth/refresh`, {}, { withCredentials: true });
        const { token } = res.data;

        // Update localStorage
        const authData = JSON.parse(localStorage.getItem("localspot_auth"));
        localStorage.setItem("localspot_auth", JSON.stringify({ ...authData, token }));

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed (e.g., refresh token expired)
        localStorage.removeItem("localspot_auth");
        window.location.href = "/auth";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
