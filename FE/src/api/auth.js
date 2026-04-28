import axios from "axios";
import { getUserFromToken } from "../utils/jwt";

const API_URL = import.meta.env.VITE_API_BASE_URL;

const unwrapAuthPayload = (response) => {
  const body = response?.data;
  if (body && typeof body === "object") {
    if (Object.prototype.hasOwnProperty.call(body, "data") && (Object.prototype.hasOwnProperty.call(body, "code") || Object.prototype.hasOwnProperty.call(body, "message"))) {
      return body.data ?? {};
    }
    if (Object.prototype.hasOwnProperty.call(body, "success")) {
      return body.data ?? body;
    }
  }
  return body ?? {};
};

// LOGIN
export const login = async (username, password) => {
  const response = await axios.post(`${API_URL}/auth/login`, { username, password });
  const data = unwrapAuthPayload(response);
  const accessToken = data.accessToken ?? data.access_token ?? data.token;
  const refreshToken = data.refreshToken ?? data.refresh_token ?? data.refresh;
  const user = data.userName ?? data.username ?? data.user ?? null;
  const avatar = data.avatar ?? null;

  if (!accessToken) {
    throw new Error("Login response did not include an access token.");
  }

  localStorage.setItem("access_token", accessToken);
  if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
  const currentUser = getUserFromToken();
  const uid = data.userId ?? data.id ?? data.user_id ?? currentUser?.userId ?? currentUser?.id;

  if (user) localStorage.setItem("username", user);
  if (avatar) localStorage.setItem("avatar", avatar);
  if (uid !== undefined && uid !== null) localStorage.setItem("userId", String(uid));

  return { accessToken, refreshToken, username: user ?? currentUser?.username ?? null, avatar, userId: uid };
};

// SIGNUP
export const signup = async (formData) => {
  const payload = {
    username: formData.username,
    email: formData.email,
    phone: formData.phone,
    password: formData.password,
  };
  const response = await axios.post(`${API_URL}/auth/register`, payload, {
    headers: { "Content-Type": "application/json" },
  });
  return unwrapAuthPayload(response);
};

// LOGOUT
export const logout = async () => {
  try {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      await axios.post(`${API_URL}/auth/logout`, { refreshToken });
    }
  } catch (err) {
    console.error("Logout API failed:", err);
  } finally {
    const keys = ["access_token", "refresh_token", "username", "avatar", "userId"];
    keys.forEach((k) => localStorage.removeItem(k));
    // clear axios Authorization header if any
    if (axios?.defaults?.headers?.common?.Authorization) {
      delete axios.defaults.headers.common.Authorization;
    }
    window.location.href = "/login";
  }
};

// REFRESH TOKEN
export const refreshToken = async () => {
  try {
    const token = localStorage.getItem("refresh_token");
    if (!token) throw new Error("No refresh token available");

    const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: token }, {
      headers: { "Content-Type": "application/json" },
    });

    const payload = unwrapAuthPayload(response);
    const accessToken = payload?.accessToken ?? payload?.access_token ?? payload?.token;
    if (!accessToken) {
      throw new Error("Refresh response did not include an access token.");
    }
    localStorage.setItem("access_token", accessToken);
    window.dispatchEvent(new Event("auth-changed"));
    return accessToken;
  } catch (err) {
    console.error("Refresh token failed:", err);
    throw err;
  }
};

export const getAccessToken = () => localStorage.getItem("access_token");
export const getRefreshToken = () => localStorage.getItem("refresh_token");
export const isLoggedIn = () => !!localStorage.getItem("access_token");
export const getCurrentUser = () => getUserFromToken();

// Interceptor + Refresh flow
let refreshInFlight = null;

const doRefreshOnce = async () => {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const newToken = await refreshToken();
    return newToken;
  })();

  try {
    const result = await refreshInFlight;
    refreshInFlight = null;
    return result;
  } catch (e) {
    refreshInFlight = null;
    throw e;
  }
};

/** Initialize axios interceptor to handle 401 -> refresh or logout */
export const initAuthInterceptors = () => {
  if (axios.__jp_interceptor_registered) return;
  axios.__jp_interceptor_registered = true;

  axios.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  axios.interceptors.response.use(
    (res) => res,
    async (error) => {
      const { response, config } = error || {};
      if (!response || !config) return Promise.reject(error);

      const url = String(config.url || "");
      const isAuthApi = /\/auth\/(login|logout|refresh)/i.test(url);

      if (response.status === 401 && !isAuthApi && !config.__isRetryRequest) {
        try {
          const newAccess = await doRefreshOnce();
          const retryCfg = { ...config, __isRetryRequest: true };
          retryCfg.headers = {
            ...(retryCfg.headers || {}),
            Authorization: `Bearer ${newAccess}`,
          };
          return axios(retryCfg);
        } catch (e) {
          await logout();
          return Promise.reject(e);
        }
      }

      return Promise.reject(error);
    }
  );
};

// Logout from all devices
export const logoutAllDevices = async () => {
  try {
    await axios.post(`${API_URL}/auth/logout-all`);
  } catch (err) {
    console.error("Logout-all API failed:", err);
  } finally {
    const keys = ["access_token", "refresh_token", "username", "avatar", "userId"];
    keys.forEach((k) => localStorage.removeItem(k));
    if (axios?.defaults?.headers?.common?.Authorization) {
      delete axios.defaults.headers.common.Authorization;
    }
    window.location.href = "/login";
  }
};

// Change password
export const changePassword = async (oldPassword, newPassword) => {
  const res = await axios.post(`${API_URL}/auth/change-password`, null, {
    params: { oldPassword, newPassword },
  });
  return unwrapAuthPayload(res);
};