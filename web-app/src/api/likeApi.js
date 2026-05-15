import axiosClient from "./axiosClient";

const likeApi = {
  togglePost(postId) {
    return axiosClient.post(`/interaction/posts/${postId}/likes/toggle`);
  },

  toggleComment(commentId) {
    return axiosClient.post(`/interaction/comments/${commentId}/likes/toggle`);
  },

  // Lấy danh sách người đã like bài viết (tối đa limit người)
  getPostLikers(postId, limit = 10) {
    return axiosClient.get(`/interaction/posts/${postId}/likes/users`, {
      params: { limit },
    });
  },
};

export default likeApi;