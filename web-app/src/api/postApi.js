import axiosClient from "./axiosClient";

const postApi = {
  /**
   * 1. TẠO BÀI VIẾT
   * Backend dùng: @RequestBody PostCreateRequest (JSON)
   * Payload: { content: string, repostOfId: string, mediaIds: string[] }
   */
  create(payload) {
    return axiosClient.post("/post/posts", payload);
  },

  /**
   * 2. XÓA BÀI VIẾT
   * Backend dùng: @DeleteMapping("/posts/{postId}")
   */
  deletePost(postId) {
    return axiosClient.delete(`/post/posts/${postId}`);
  },

  /**
   * 3. LẤY BẢNG TIN (FEED)
   * Backend dùng: @GetMapping("/feed")
   */
  getFeed({ page = 0, size = 20 } = {}) {
    return axiosClient.get("/post/feed", {
      params: { page, size }
    });
  },

  /**
   * 4. LẤY BÀI VIẾT CỦA MÌNH
   * Backend dùng: @GetMapping("/posts/profile")
   */
  getMyPosts() {
    return axiosClient.get("/post/posts/profile");
  },

  /**
   * 5. LẤY BÀI VIẾT CỦA USER KHÁC
   * Backend dùng: @GetMapping("/posts/profile/{username}")
   */
  getUserPosts(username) {
    return axiosClient.get(`/post/posts/profile/${username}`);
  },

  /**
   * 6. LẤY CHI TIẾT 1 BÀI VIẾT
   * Backend dùng: @GetMapping("/posts/{postId}")
   */
  getPostById(postId) {
    return axiosClient.get(`/post/posts/${postId}`);
  },

  /**
   * 7. LẤY DANH SÁCH REPOST CỦA MÌNH
   * Backend dùng: @GetMapping("/posts/profile/reposts")
   */
  getMyReposts() {
    return axiosClient.get("/post/posts/profile/reposts");
  },

  /**
   * 8. LẤY DANH SÁCH REPOST CỦA USER KHÁC
   * Backend dùng: @GetMapping("/posts/profile/{username}/reposts")
   */
  getUserReposts(username) {
    return axiosClient.get(`/post/posts/profile/${username}/reposts`);
  },

  /**
   * 9. LẤY THÔNG TIN USER QUA USERNAME
   * (Thường endpoint này nằm ở Identity/Profile Service)
   */
  getUserByUsername(username) {
    return axiosClient.get(`/profile/users/${username}`);
  },
};

export default postApi;