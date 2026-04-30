import axiosClient from "../services/axiosClient";
import { dedupeGet } from "./requestCache";

const API_URL = import.meta.env.VITE_API_BASE_URL;

const unwrap = (res) => {
  const body = res?.data;
  if (body && typeof body === "object") {
    if (Object.prototype.hasOwnProperty.call(body, "data") && (Object.prototype.hasOwnProperty.call(body, "code") || Object.prototype.hasOwnProperty.call(body, "message"))) {
      return body.data;
    }
    if (Object.prototype.hasOwnProperty.call(body, "success")) {
      if (body.success === false) {
        const msg = body.message || "Request failed";
        const err = new Error(msg);
        err.response = { status: res?.status, data: body };
        throw err;
      }
      return body.data ?? body;
    }
  }
  return body;
};

const rethrow = (err) => {
  if (err?.response) {
    const { status, data } = err.response;
    let message = typeof data === "string" ? data : data?.message || err.message || "Request failed";
    if (status === 401) message = "Unauthorized. Please login again.";
    if (status === 403) message = "Access denied. You do not have permission.";
    const e = new Error(message);
    e.response = err.response;
    throw e;
  }
  throw err;
};

// GET /user-roles/{userId}
export const getUserRoles = async (userId) => {
  try {
    const data = await dedupeGet(axiosClient, `${API_URL}/user-roles/${userId}`);
    return Array.isArray(data) ? data : (data?.items ?? []);
  } catch (err) {
    rethrow(err);
  }
};

// POST /user-roles/{userId}
export const addRolesToUser = async (userId, roleIds = []) => {
  try {
    return await axiosClient.post(`${API_URL}/user-roles/${userId}`, { roleIds });
  } catch (err) {
    rethrow(err);
  }
};

// PUT /user-roles/{userId}
export const replaceUserRoles = async (userId, roleIds = []) => {
  try {
    return await axiosClient.put(`${API_URL}/user-roles/${userId}`, { roleIds });
  } catch (err) {
    rethrow(err);
  }
};

// DELETE /user-roles/{userId}/{roleId}
export const removeUserRole = async (userId, roleId) => {
  try {
    return await axiosClient.delete(`${API_URL}/user-roles/${userId}/${roleId}`);
  } catch (err) {
    rethrow(err);
  }
};
