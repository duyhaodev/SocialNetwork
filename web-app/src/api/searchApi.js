import axiosClient from "./axiosClient";

export const searchApi = {
  search: (keyword) => axiosClient.get(`/api/search?keyword=${encodeURIComponent(keyword)}`),

  searchUsers(keyword) {
    const url = `profile/users?keyword=${encodeURIComponent(keyword)}`
    return axiosClient.get(url, keyword)
  }
};