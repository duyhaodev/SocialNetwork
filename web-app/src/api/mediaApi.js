import axiosClient from "./axiosClient";

const mediaApi = {
    // Giữ nguyên kiểu ngắn gọn của Hào
    upload(formData) {
        return axiosClient.post("/media/upload", formData);
    },

    // Thêm hàm mới vào đây
    getConversationMedia(conversationId) {
        return axiosClient.get(`/media/conversation/${conversationId}`);
    }
};

export default mediaApi;