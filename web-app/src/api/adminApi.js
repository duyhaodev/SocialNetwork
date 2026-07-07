import axiosClient from "./axiosClient";
const adminApi = {
  getAllUsers: (page = 0, size = 10, keyword = "") => {
    let url = `/identity/admin/users?page=${page}&size=${size}`;
    if (keyword) {
      url += `&keyword=${encodeURIComponent(keyword)}`;
    }
    return axiosClient.get(url);
  },
  banUser: (userId) => axiosClient.put(`/identity/admin/users/${userId}/ban`),
  unbanUser: (userId) => axiosClient.put(`/identity/admin/users/${userId}/unban`),
  getUserStats: () => axiosClient.get("/identity/admin/users/stats"),
  verifyUser: (userId) => axiosClient.put(`/profile/admin/profiles/${userId}/verify`),

  getAllPosts: (page = 0, size = 10) => axiosClient.get(`/post/admin/posts?page=${page}&size=${size}`),
  deletePost: (postId) => axiosClient.delete(`/post/admin/posts/${postId}`),
  getPostStats: () => axiosClient.get("/post/admin/posts/stats"),

  createReport: (data) => axiosClient.post("/post/reports", data),
  getPendingReports: (page = 0, size = 10) => axiosClient.get(`/post/admin/reports?page=${page}&size=${size}`),
  resolveReport: (reportId) => axiosClient.put(`/post/admin/reports/${reportId}/resolve`),
  dismissReport: (reportId) => axiosClient.put(`/post/admin/reports/${reportId}/dismiss`),

  getPostComments: (postId, page = 0, size = 50) => axiosClient.get(`/interaction/admin/comments/post/${postId}?page=${page}&size=${size}`),
  getAllComments: (page = 0, size = 10) => axiosClient.get(`/interaction/admin/comments?page=${page}&size=${size}`),
  deleteComment: (commentId) => axiosClient.delete(`/interaction/admin/comments/${commentId}`),
  restoreComment: (commentId) => axiosClient.put(`/interaction/admin/comments/${commentId}/restore`),
  getCommentStats: () => axiosClient.get("/interaction/admin/comments/stats")
};
export default adminApi;
