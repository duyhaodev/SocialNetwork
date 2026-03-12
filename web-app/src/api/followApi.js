import axios from "./axiosClient";

const followApi = {
  // Lấy trạng thái follow của người dùng hiện tại đối với followingId
  checkFollowing: (followingId) => {
    return axios.get(`/api/follow/status/${followingId}`);
  },

  // Toggle follow/unfollow
  toggleFollow: (followingId) => {
    return axios.post(`/api/follow/${followingId}/toggle`);
  },
};

export default followApi;