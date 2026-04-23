import axiosClient from "./axiosClient";

const likeApi = {
  togglePost(postId) {
    return axiosClient.post(`/interaction/posts/${postId}/likes/toggle`);
  },

  toggleComment(commentId) {
    return axiosClient.post(`/interaction/comments/${commentId}/likes/toggle`);
  },
};

export default likeApi;