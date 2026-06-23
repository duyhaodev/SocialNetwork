import axios from "axios";
import { getAccessToken, getRefreshToken, setToken, removeToken } from "./localStorageService";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8888',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const handleUnauthorized = async () => {
  removeToken();
  try {
    const { logout } = await import("../store/userSlice");
    const { default: store } = await import("../app/store");
    store.dispatch(logout());
  } catch (err) {
    console.error("Error during auto-logout dispatch:", err);
  }
};

// Request Interceptor
axiosClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

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
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url = originalRequest.url || "";

    const isAuthEndpoint =
      url.includes("/auth/token") ||
      url.includes("/users/registration") ||
      url.includes("/auth/refresh");

    // Nếu lỗi 401 và không phải là endpoint auth
    if (status === 401 && !isAuthEndpoint && !originalRequest._retry) {

      if (isRefreshing) {
        // Nếu đang có một request refresh khác chạy, cho request này vào hàng đợi
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();

      if (refreshToken) {
        try {
          // Gọi trực tiếp axios để tránh loop vô tận
          const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8888'}/identity/auth/refresh`, {
            token: refreshToken
          });

          if (res.data.code === 1000) {
            const { accessToken, refreshToken: newRefreshToken } = res.data.result;
            setToken(accessToken, newRefreshToken);

            // Cập nhật token cho tất cả request đang xếp hàng
            processQueue(null, accessToken);

            // Cập nhật header và thực hiện lại request ban đầu
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return axiosClient(originalRequest);
          } else {
            processQueue(new Error('Refresh API returned non-1000 code'));
            handleUnauthorized();
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          handleUnauthorized();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        isRefreshing = false;
        handleUnauthorized();
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
