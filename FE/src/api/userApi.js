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

    const wrapped = new Error(message);
    wrapped.response = err.response;
    throw wrapped;
  }

  throw err;
};

const normalizeActiveToShort = (active) => {
  if (active === undefined || active === null) return undefined;
  if (typeof active === "number") return active > 0 ? 1 : 0;
  if (typeof active === "boolean") return active ? 1 : 0;

  const normalized = String(active).trim().toLowerCase();
  if (["1", "true", "active", "enabled", "activated"].includes(normalized)) return 1;
  if (["0", "false", "inactive", "disabled", "deactivated"].includes(normalized)) return 0;

  const numeric = Number(normalized);
  if (!Number.isNaN(numeric)) return numeric > 0 ? 1 : 0;
  return undefined;
};

// GET /users?page=&size=&role=
export const getUsers = async ({ page = 1, limit = 10, role } = {}) => {
  try {
    const size = Number(limit) > 0 ? Number(limit) : 10;
    const res = await dedupeGet(axiosClient, `${API_URL}/users`, {
      params: {
        ...(role ? { role } : {}),
        page,
        size,
      },
    });

    const data = res ?? {};
    const items = Array.isArray(data.content) ? data.content : [];

    return {
      items,
      total: Number(data.totalElements ?? items.length ?? 0),
      page: Number(data.number ?? page - 1) + 1,
      size: Number(data.size ?? size),
      totalPages: Number(data.totalPages ?? 0),
    };
  } catch (err) {
    rethrow(err);
  }
};

// GET /users/{id}
export const getUserById = async (id) => {
  try {
    return await dedupeGet(axiosClient, `${API_URL}/users/${id}`);
  } catch (err) {
    rethrow(err);
  }
};

// POST /users
export const createUser = async ({ username, email, phone, password, passwordHash }) => {
  try {
    const payload = {
      username,
      email,
      phone,
      password: password ?? passwordHash,
    };

    const res = await axiosClient.post(`${API_URL}/users`, payload);

    return res;
  } catch (err) {
    rethrow(err);
  }
};

// PUT /users/{id}
export const updateUser = async (id, { email, password, passwordHash, active } = {}) => {
  try {
    const activeShort = normalizeActiveToShort(active);
    const payload = {
      ...(email !== undefined ? { email } : {}),
      ...(password !== undefined || passwordHash !== undefined
        ? { password: password ?? passwordHash }
        : {}),
      ...(activeShort !== undefined ? { active: activeShort } : {}),
    };

    const res = await axiosClient.put(`${API_URL}/users/${id}`, payload);

    return res;
  } catch (err) {
    rethrow(err);
  }
};

// DELETE /users/{id}
export const deleteUser = async (userId) => {
  try {
    return await axiosClient.delete(`${API_URL}/users/${userId}`);
  } catch (err) {
    rethrow(err);
  }
};
