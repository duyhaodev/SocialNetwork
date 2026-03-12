import axios from "./axiosClient";

const notificationApi = {
  // Lấy danh sách thông báo
  getNotifications: ({ type = "all", limit = 20 } = {}) => {
    return axios.get("/api/notifications", {
      params: { type, limit },
    });
  },

  // Đánh dấu thông báo là đã đọc
  markAsRead: (notificationId) => {
    return axios.patch(`/api/notifications/${notificationId}/read`);
  },

  // Follow back từ thông báo
  followBack: (notificationId) => {
    return axios.post(`/api/notifications/follow-back/${notificationId}`);
  },

  // Đánh dấu tất cả thông báo là đã đọc
  markAllRead: () => {
    return axios.patch("/api/notifications/read-all");
  },
};

export default notificationApi;
