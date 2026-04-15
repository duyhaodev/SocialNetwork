import axiosClient from "./axiosClient";

const userApi = {
  getMyInfo() {
    const url = "profile/myInfo"
    return axiosClient.get(url)
  },
  editProfile(formData) {
    return axiosClient.put("profile/users/editprofile", formData, {
      transformRequest: (v) => v,
    });
  },
}

export default userApi