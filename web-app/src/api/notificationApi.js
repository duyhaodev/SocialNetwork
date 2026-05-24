import axios from "./axiosClient";
import { getAccessToken } from "./localStorageService";

// Decode JWT thủ công để tránh thêm dependency jwt-decode.
// JWT có dạng header.payload.signature (base64url-encoded).
const decodeJwt = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
};

const getCurrentUserId = () => {
  const token = getAccessToken();
  if (!token) return null;
  const payload = decodeJwt(token);
  return payload?.userId || payload?.sub || payload?.id || null;
};

const notificationApi = {
  // Lấy danh sách thông báo grouped của user hiện tại
  getNotifications: ({ type, limit = 20 } = {}) => {
    const userId = getCurrentUserId();
    if (!userId) return Promise.resolve({ activities: [], unreadCount: 0 });
    const params = { limit };
    if (Array.isArray(type) && type.length > 0) {
      params.type = type;
    } else if (typeof type === "string" && type && type !== "all") {
      params.type = type;
    }
    return axios.get(`/notification/api/notifications/${userId}`, { params });
  },

  // Đánh dấu thông báo là đã đọc
  markAsRead: (notificationId) => {
    return axios.patch(`/notification/api/notifications/${notificationId}/read`);
  },

  // Follow back từ thông báo
  followBack: (targetUserId) => {
    return axios.post(`/follow/api/follow/${targetUserId}/toggle`);
  },

  // Đánh dấu tất cả thông báo là đã đọc
  markAllRead: () => {
    return axios.patch("/notification/api/notifications/read-all");
  },
};

export default notificationApi;
