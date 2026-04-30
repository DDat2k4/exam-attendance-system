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

// GET /permissions?page=&size=&resource=
export const getPermissions = async ({ page = 1, limit = 10, sort, filters = {} } = {}) => {
	try {
		const size = Number(limit) > 0 ? Number(limit) : 10;
		const params = {
			...(filters?.resource ? { resource: filters.resource } : {}),
			page,
			size,
			...(sort ? { sort } : {}),
		};
		const res = await dedupeGet(axiosClient, `${API_URL}/permissions`, {
			params,
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

// Get permission by id
export const getPermissionById = async (id) => {
	try {
		return await dedupeGet(axiosClient, `${API_URL}/permissions/${id}`);
	} catch (err) {
		rethrow(err);
	}
};

// GET /permissions/grouped
export const getGroupedPermissions = async () => {
	try {
		return await dedupeGet(axiosClient, `${API_URL}/permissions/grouped`);
	} catch (err) {
		rethrow(err);
	}
};

// Create permission
export const createPermission = async (permission) => {
	try {
		return await axiosClient.post(`${API_URL}/permissions`, permission);
	} catch (err) {
		rethrow(err);
	}
};

// Update permission
export const updatePermission = async (id, permission) => {
	try {
		return await axiosClient.put(`${API_URL}/permissions/${id}`, permission);
	} catch (err) {
		rethrow(err);
	}
};

// Delete permission
export const deletePermission = async (id) => {
	try {
		return await axiosClient.delete(`${API_URL}/permissions/${id}`);
	} catch (err) {
		rethrow(err);
	}
};
