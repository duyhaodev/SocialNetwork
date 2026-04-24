import axiosClient from "./axiosClient";

<<<<<<< HEAD
export const mediaApi = {
    upload(files) {
        const formData = new FormData();
        if (Array.isArray(files)) {
            files.forEach(file => formData.append("files", file));
        } else {
            formData.append("files", files);
        }

        return axiosClient.post("/media/upload", formData, {
            transformRequest: (v) => v
        });
    },

    getConversationMedia(conversationId) {
        return axiosClient.get(`/media/conversation/${conversationId}`);
    }
}
=======
const mediaApi = {
  upload(formData) {
    return axiosClient.post("/media/upload", formData);
  },
};

export default mediaApi;
>>>>>>> HiepKa
