import axiosClient from "./axiosClient";

const userApi = {
  // Lấy thông tin cá nhân
  getMyInfo() {
    const url = "profile/myInfo";
    return axiosClient.get(url);
  },

  // Cập nhật thông tin cá nhân
  editProfile(payload) {
    const url = "profile/myInfo";
    return axiosClient.put(url, payload); 
  },

  // Lấy danh sách sở thích sẵn có
  getAvailableInterests() {
    const url = "profile/users/interests";
    return axiosClient.get(url);
  },

  // Lấy danh sách user từ danh sách userIds
  getUsersBatch(userIds) {
    const url = "profile/users/batch";
    return axiosClient.post(url, userIds);
  },

  blockUser(targetId) {
    const url = `profile/users/block/${targetId}`;
    return axiosClient.post(url);
  },

  unblockUser(targetId) {
    const url = `profile/users/block/${targetId}`;
    return axiosClient.delete(url);
  },

  getBlockedUsers() {
    const url = `profile/users/block`;
    return axiosClient.get(url);
  }
};

export default userApi;