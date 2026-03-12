import axiosClient from "./axiosClient";

const userApi = {
    getMyInfo () {
        const url = "users/myInfo"
        return axiosClient.get(url)
    },
    editProfile(formData) {
    return axiosClient.put("/users/editprofile", formData, {
      transformRequest: (v) => v,
    });
  },
}

export default userApi