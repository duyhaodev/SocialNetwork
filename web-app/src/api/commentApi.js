import axiosClient from "./axiosClient";

const commentApi = {
  getComments(postId, page = 0, size = 10) {
    return axiosClient.get(`/posts/${postId}/comments`, {
      params: { page, size },
    });
  },

  createComment(postId, formData) {
    return axiosClient.post(`/posts/${postId}/comments`, formData, {
      transformRequest: (v) => v,
    });
  },
};

export default commentApi;
