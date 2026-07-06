import axiosClient from './axiosClient';

const adminApi = {
  // --- USERS ---
  getAllUsers: (page = 0, size = 10) => {
    return axiosClient.get(`/identity/admin/users?page=${page}&size=${size}`);
  },
  banUser: (userId) => {
    return axiosClient.put(`/identity/admin/users/${userId}/ban`);
  },
  unbanUser: (userId) => {
    return axiosClient.put(`/identity/admin/users/${userId}/unban`);
  },
  getUserStats: () => {
    return axiosClient.get('/identity/admin/users/stats');
  },
  verifyUser: (userId) => {
    return axiosClient.put(`/profile/admin/profiles/${userId}/verify`);
  },

  // --- POSTS ---
  getAllPosts: (page = 0, size = 10) => {
    return axiosClient.get(`/post/admin/posts?page=${page}&size=${size}`);
  },
  deletePost: (postId) => {
    return axiosClient.delete(`/post/admin/posts/${postId}`);
  },
  getPostStats: () => {
    return axiosClient.get('/post/admin/posts/stats');
  },

  // --- REPORTS ---
  createReport: (data) => {
    return axiosClient.post('/post/reports', data);
  },
  getPendingReports: (page = 0, size = 10) => {
    return axiosClient.get(`/post/admin/reports?page=${page}&size=${size}`);
  },
  resolveReport: (reportId) => {
    return axiosClient.put(`/post/admin/reports/${reportId}/resolve`);
  },
  dismissReport: (reportId) => {
    return axiosClient.put(`/post/admin/reports/${reportId}/dismiss`);
  },

  // --- COMMENTS ---
  getAllComments: (page = 0, size = 10) => {
    return axiosClient.get(`/interaction/admin/comments?page=${page}&size=${size}`);
  },
  deleteComment: (commentId) => {
    return axiosClient.delete(`/interaction/admin/comments/${commentId}`);
  },
  getCommentStats: () => {
    return axiosClient.get('/interaction/admin/comments/stats');
  }
};

export default adminApi;
