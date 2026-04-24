import axiosClient from "./axiosClient";

const repostApi = {
  toggle(postId) {
    return axiosClient.post(`/interaction/reposts/${postId}`);
  },
};

export default repostApi;