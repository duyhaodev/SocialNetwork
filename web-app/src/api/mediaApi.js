import axiosClient from "./axiosClient";

const mediaApi = {
    // Giữ nguyên kiểu ngắn gọn của Hào
    upload(formData) {
        return axiosClient.post("/media/upload", formData);
    },

    // Thêm hàm mới vào đây
    getConversationMedia(conversationId) {
        return axiosClient.get(`/media/conversation/${conversationId}`);
    },

    getConversationMediaPaged(conversationId, page = 0, size = 18) {
        return axiosClient.get(`/media/conversation/${conversationId}/paged`, {
            params: { page, size }
        });
    }
};

export default mediaApi;