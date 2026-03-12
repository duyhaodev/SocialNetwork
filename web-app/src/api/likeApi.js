import axiosClient from "./axiosClient";

const likeApi = {
  togglePost(postId) {
    return axiosClient.post(`/posts/${postId}/likes/toggle`);
  },

  toggleComment(commentId) {
    return axiosClient.post(`/comments/${commentId}/likes/toggle`);
  },
};

export default likeApi;
