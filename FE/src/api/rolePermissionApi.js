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

// Get permissions of a role
export const getRolePermissions = async (roleId) => {
	try {
		const data = await dedupeGet(axiosClient, `${API_URL}/roles/${roleId}/permissions`);
		return Array.isArray(data) ? data : (data?.items ?? []);
	} catch (err) {
		rethrow(err);
	}
};

// Add permissions to a role
export const addPermissionsToRole = async (roleId, permissionIds = []) => {
	try {
		return await axiosClient.post(`${API_URL}/roles/${roleId}/permissions`, { permissionIds });
	} catch (err) {
		rethrow(err);
	}
};

// Replace role permissions
export const replaceRolePermissions = async (roleId, permissionIds = []) => {
	try {
		return await axiosClient.put(`${API_URL}/roles/${roleId}/permissions`, { permissionIds });
	} catch (err) {
		rethrow(err);
	}
};

// Remove a permission from a role
export const removePermissionFromRole = async (roleId, permissionId) => {
	try {
		return await axiosClient.delete(`${API_URL}/roles/${roleId}/permissions/${permissionId}`);
	} catch (err) {
		rethrow(err);
	}
};
