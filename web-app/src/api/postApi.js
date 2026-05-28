import axiosClient from "./axiosClient";

const postApi = {
  // Tạo bài viết
  create(payload) {
    return axiosClient.post("/post/posts", payload);
  },

  // Xóa bài viết
  deletePost(postId) {
    return axiosClient.delete(`/post/posts/${postId}`);
  },

  // Lấy bảng tin chính (Feed)
  getFeed({ page = 0, size = 20 } = {}) {
    return axiosClient.get("/post/feed", {
      params: { page, size }
    });
  },

  // Lấy bài viết của mình
  getMyPosts() {
    return axiosClient.get("/post/posts/profile");
  },

  // Lấy bài viết của user khác
  getUserPosts(username) {
    return axiosClient.get(`/post/posts/profile/${username}`);
  },

  // Lấy chi tiết 1 bài viết
  getPostById(postId) {
    return axiosClient.get(`/post/posts/${postId}`);
  },

  // Lấy danh sách repost của mình
  getMyReposts() {
    return axiosClient.get("/post/posts/profile/reposts");
  },

  // Lấy danh sách repost của user khác
  getUserReposts(username) {
    return axiosClient.get(`/post/posts/profile/${username}/reposts`);
  },

  // Lấy thông tin user qua username
  getUserByUsername(username) {
    return axiosClient.get(`/profile/users/${username}`);
  },

  // Lấy tên tỉnh/thành từ IP của client (gọi 1 lần khi đăng nhập để hiển thị tên tab Local Feed)
  resolveCity() {
    return axiosClient.get("/post/feed/resolve-city");
  },

  // Lấy feed bài viết theo tỉnh/thành (isFallback: true nếu tỉnh chưa có bài sẽ lây toàn quốc)
  getLocalFeed({ city, page = 0, size = 20 } = {}) {
    return axiosClient.get("/post/feed/local", {
      params: { city, page, size },
    });
  },

  // Dịch nội dung bài viết sang tiếng Việt qua DeepL
  translate(text) {
    return axiosClient.post("/post/posts/translate", { text });
  },
};

export default postApi;
