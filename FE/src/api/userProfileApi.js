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
        const message = body.message || "Request failed";
        const err = new Error(message);
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

// GET /user-profiles/{id}
export const getUserProfile = async (id) => {
  try {
    return await dedupeGet(axiosClient, `${API_URL}/user-profiles/${id}`);
  } catch (err) {
    rethrow(err);
  }
};


// GET /user-profiles (paged list with filters)
export const getUserProfiles = async ({
  name,
  gender,
  page = 1,
  size = 10,
} = {}) => {
  try {
    const params = {
      page,
      size,
      ...(name ? { name } : {}),
      ...(typeof gender === "number" ? { gender } : {}),
    };
    const res = await dedupeGet(axiosClient, `${API_URL}/user-profiles`, {
      params,
    });
    const data = res ?? {};
    const pageData = data?.content ? data : data?.data ?? {};

    return {
      items: Array.isArray(pageData.content)
        ? pageData.content
        : Array.isArray(pageData.items)
          ? pageData.items
          : [],
      total: Number(pageData.totalElements ?? pageData.total ?? 0),
      page: Number(
        pageData.number !== undefined
          ? Number(pageData.number) + 1
          : pageData.page ?? page,
      ),
      size: Number(pageData.size ?? size),
    };
  } catch (err) {
    rethrow(err);
  }
};

// POST /user-profiles
export const createUserProfile = async (profile) => {
  try {
    return await axiosClient.post(`${API_URL}/user-profiles`, profile);
  } catch (err) {
    rethrow(err);
  }
};

// PUT /user-profiles/{id}
export const updateUserProfile = async (id, profile) => {
  try {
    return await axiosClient.put(`${API_URL}/user-profiles/${id}`, profile);
  } catch (err) {
    rethrow(err);
  }
};

// DELETE /user-profiles/{id}
export const deleteUserProfile = async (id) => {
  try {
    return await axiosClient.delete(`${API_URL}/user-profiles/${id}`);
  } catch (err) {
    rethrow(err);
  }
};
