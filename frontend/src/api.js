import axios from "axios";

const configuredApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const apiUrl = new URL(configuredApiUrl, window.location.origin);
const apiBaseUrl = apiUrl.hostname === "localhost" &&
  !["localhost", "127.0.0.1"].includes(window.location.hostname)
  ? "/api"
  : configuredApiUrl;

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("resolvex_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function getErrorMessage(error) {
  return error.response?.data?.message || error.message || "Something went wrong. Please try again.";
}

export default api;
