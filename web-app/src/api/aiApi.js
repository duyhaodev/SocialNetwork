import axios from "axios";
import { getAccessToken } from "./localStorageService";

const aiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8888",
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

aiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

aiClient.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(err.response?.data || err)
);

const aiApi = {
  suggest(payload) {
    return aiClient.post("/ai/suggest", payload);
  },
  moderate(payload) {
    return aiClient.post("/ai/moderate", payload);
  },
};

export default aiApi;
