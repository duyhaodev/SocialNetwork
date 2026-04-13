import axios from "axios"
import { getToken } from "./localStorageService";

const axiosClient = axios.create({
    baseURL: 'http://localhost:8080',
    //baseURL: 'https://109a273e8a9f.ngrok-free.app',
    headers: {
        'Content-Type': 'application/json',
        //'ngrok-skip-browser-warning': 'true'
    },
    withCredentials: true
});

//Interceptors
// Add a request interceptor
axiosClient.interceptors.request.use( 
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Nếu là POST /posts và đang gửi FormData → xoá Content-Type để browser tự set boundary
    const isCreatePost = config.method === 'post' && (config.url || '').startsWith('/posts');
    if (isCreatePost && config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  }, (error) => {
    return Promise.reject(error);
});

// Add a response interceptor
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;  //Lấy mã lỗi 400, 401, 403, 500...
    const url = error.config?.url || "";  // Lấy URL của API bị lỗi (nếu có)

    const isAuthEndpoint =
      url.includes("/auth/token") ||
      url.includes("/users") ||          
      url.includes("/auth/refresh");

    if (status === 401 && !isAuthEndpoint) {
      // token invalid or expired -> clear and redirect to login
      localStorage.removeItem("token");
      // Force reload to ensure app state (redux) resets; navigate to login
      window.location.href = "/login";
    }

    if (error.response?.data) {
        return Promise.reject(error.response.data);
    }

    const message =
      error.response?.data?.message || "Server error, please try again later!";
    return Promise.reject(new Error(message));  // Ném lỗi ra ngoài dưới dạng `Error(message)`
  }
);


export default axiosClient;
