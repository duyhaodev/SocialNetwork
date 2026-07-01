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

  // Phân tích ảnh: kiểm duyệt nhạy cảm + phát hiện ảnh AI
  // file: File object (raw file từ input)
  // Trả về: { nsfw: { is_safe, label, severity, confidence }, ai_generated: { is_ai, label, confidence } }
  analyzeImage(file) {
    const fd = new FormData();
    fd.append("file", file);
    return aiClient.post("/ai/analyze-image", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export default aiApi;
