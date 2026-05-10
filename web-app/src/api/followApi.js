import axios from "./axiosClient";

const followApi = {
  // Returns { isFollowing, isFriend } for current user → targetUserId
  getFollowStatus: (targetUserId) => {
    return axios.get(`/follow/api/follow/status/${targetUserId}`);
  },

  // Toggle follow/unfollow — returns { success, isFollowing, isFriend }
  toggleFollow: (followingId) => {
    return axios.post(`/follow/api/follow/${followingId}/toggle`);
  },
};

export default followApi;