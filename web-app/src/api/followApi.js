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

  // Gợi ý kết bạn — phân trang
  getSuggestions: (page = 0, size = 10) => {
    return axios.get(`/follow/api/follow/suggestions`, { params: { page, size } });
  },

  // Danh sách followers của userId
  getFollowers: (userId) => {
    return axios.get(`/follow/api/follow/followers/${userId}`);
  },

  // Danh sách following của userId
  getFollowing: (userId) => {
    return axios.get(`/follow/api/follow/following/${userId}`);
  },

  // Danh sách bạn bè (follow 2 chiều) của userId
  getFriends: (userId) => {
    return axios.get(`/follow/api/follow/friends/${userId}`);
  },
};

export default followApi;