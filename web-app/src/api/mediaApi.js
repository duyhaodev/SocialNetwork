import axiosClient from "./axiosClient";

const mediaApi = {
  upload(formData) {
    return axiosClient.post("/media/upload", formData);
  },
};

export default mediaApi;