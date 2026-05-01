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
};

export default userApi;