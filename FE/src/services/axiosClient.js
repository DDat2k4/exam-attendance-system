import axios from "axios";
import { getAccessToken, refreshToken, logout } from "../api/auth";

const API_URL = import.meta.env.VITE_API_BASE_URL;

const axiosClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================
// Lock + Queue để tránh race condition 401
// ============================================
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor: thêm token
axiosClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: unwrap data + handle 401 + other errors
axiosClient.interceptors.response.use(
  (response) => {
    // Unwrap response data
    return response.data?.data ?? response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // ============================================
    // Handle 401 với lock + queue
    // ============================================
    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Đã có request đang refresh token → queue lại request này
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              originalRequest.headers["Authorization"] = `Bearer ${token}`;
              resolve(axiosClient(originalRequest));
            },
            reject: (err) => reject(err),
          });
        });
      }

      // Set flag refresh
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newAccessToken = await refreshToken();

        // Process queue với token mới
        processQueue(null, newAccessToken);

        // Retry request gốc
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        return axiosClient(originalRequest);
      } catch (err) {
        // Refresh fail → reject tất cả queue
        processQueue(err, null);

        // Logout user
        await logout();

        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    // ============================================
    // Handle other error codes
    // ============================================
    let message = error.response?.data?.message || error.message || "Có lỗi xảy ra";

    if (status === 400) {
      message = error.response?.data?.message || "Request không hợp lệ";
    } else if (status === 403) {
      message = "Bạn không có quyền truy cập tài nguyên này";
    } else if (status === 404) {
      message = "Tài nguyên không tìm thấy";
    } else if (status === 409) {
      message = error.response?.data?.message || "Xung đột dữ liệu";
    } else if (status === 500) {
      message = "Lỗi server nội bộ";
    } else if (status === 502) {
      message = "Gateway lỗi, vui lòng thử lại sau";
    } else if (status === 503) {
      message = "Server bảo trì, vui lòng thử lại sau";
    }

    // Wrap lại error với message đã format
    const formattedError = new Error(message);
    formattedError.response = error.response;
    formattedError.status = status;

    return Promise.reject(formattedError);
  }
);

export default axiosClient;
