import axiosClient from "./axiosClient";

const commentApi = {
  getComments(postId, page = 0, size = 10) {
    return axiosClient.get(`/interaction/comments/post/${postId}`, {
      params: { page, size },
    });
  },

  createComment(data) {
    return axiosClient.post(`/interaction/comments`, data);
  },

  deleteComment(commentId) {
    return axiosClient.delete(`/interaction/comments/${commentId}`);
  },

  // Lấy toàn bộ cây replies của 1 comment gốc
  getThread(commentId) {
    return axiosClient.get(`/interaction/comments/${commentId}/thread`);
  },
};

export default commentApi;