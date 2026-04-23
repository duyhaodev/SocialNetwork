import axios from "axios";
import { getToken } from "./localStorageService";

const axiosClient = axios.create({
    baseURL: 'http://localhost:8888', // Cổng của API Gateway
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true
});

// Request Interceptor
axiosClient.interceptors.request.use( 
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Tinh chỉnh check multipart: 
    // Nếu gửi FormData (thường dùng cho upload ảnh/video)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']; 
    }

    return config;
  }, (error) => {
    return Promise.reject(error);
});

// Response Interceptor
axiosClient.interceptors.response.use(
  (response) => {
    // Vì Backend bọc ApiResponse { code, result, message }
    // Trả về response.data để ở ngoài lấy được object {result, message...}
    return response.data;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";

    // Kiểm tra nếu không phải các endpoint login/register/refresh mà lỗi 401
    const isAuthEndpoint =
      url.includes("/auth/token") ||
      url.includes("/users/registration") || // Sửa lại cho khớp route đăng ký của bạn
      url.includes("/auth/refresh");

    if (status === 401 && !isAuthEndpoint) {
      localStorage.removeItem("token");
      // Tránh loop redirect nếu đang ở trang login sẵn rồi
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    // Trả về lỗi từ Server (ApiResponse) nếu có
    if (error.response?.data) {
        return Promise.reject(error.response.data);
    }

    const message = error.response?.data?.message || "Server error, please try again later!";
    return Promise.reject(new Error(message));
  }
);

export default axiosClient;