import axiosClient from "./axiosClient";

export const searchApi = {
  search: (keyword, page = 0, size = 20) =>
    axiosClient.get(`/search/all?keyword=${encodeURIComponent(keyword)}&page=${page}&size=${size}`),

  searchUsers(keyword) {
    const url = `search/users?keyword=${encodeURIComponent(keyword)}`
    return axiosClient.get(url)
  },

  searchPosts(keyword, page = 0, size = 20) {
    const url = `search/posts?keyword=${encodeURIComponent(keyword)}&page=${page}&size=${size}`
    return axiosClient.get(url)
  }
};
