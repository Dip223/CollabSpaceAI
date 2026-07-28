import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  // Render's free tier can take 50-60s to wake a sleeping instance — give
  // requests enough room instead of hanging indefinitely (axios's default
  // is no timeout at all), which otherwise looks exactly like a frozen button.
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Normalizes timeout/network failures into the same `err.response.data.message`
// shape every page already reads, so a cold or unreachable backend shows a
// clear message instead of each page's generic fallback text.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.response = {
        data: {
          message:
            error.code === "ECONNABORTED"
              ? "The server is taking too long to respond (it may be waking up from sleep). Please try again in a moment."
              : "Could not reach the server. Check your connection and try again.",
        },
      };
    }

    return Promise.reject(error);
  }
);

export default api;