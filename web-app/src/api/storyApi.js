import axios from "./axiosClient";

const storyApi = {

    // Tạo story mới 
    createStory: (request) => {
        return axios.post("/story/stories", request);
    },

    // Xóa story 
    deleteStory: (storyId) => {
        return axios.delete(`/story/stories/${storyId}`);
    },

    // Feed — stories của người mình follow 
    getFeedStories: () => {
        return axios.get("/story/stories/feed");
    },

    // Stories đang active của mình
    getMyStories: () => {
        return axios.get("/story/stories/mine");
    },

    // Kho lưu trữ — stories đã hết hạn của mình
    getArchive: () => {
        return axios.get("/story/stories/archive");
    },

    // Stories của user khác
    getUserStories: (userId) => {
        return axios.get(`/story/stories/user/${userId}`);
    },

    // Đánh dấu đã xem (gọi khi story hiển thị lên màn hình)
    markViewed: (storyId) => {
        return axios.post(`/story/stories/${storyId}/view`);
    },

    // Xem ai đã xem story (chỉ owner)
    getViewers: (storyId) => {
        return axios.get(`/story/stories/${storyId}/views`);
    },

    // Tìm nhạc Spotify
    searchMusic: (query) => {
        return axios.get("/story/music/search", { params: { q: query } });
    },
};

export default storyApi;
