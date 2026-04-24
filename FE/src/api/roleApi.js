import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL;
const getToken = () => localStorage.getItem("access_token");

const unwrap = (res) => {
	const body = res?.data;
	if (body && typeof body === "object" && Object.prototype.hasOwnProperty.call(body, "success")) {
		if (body.success === false) {
			const msg = body.message || "Request failed";
			const err = new Error(msg);
			err.response = { status: res?.status, data: body };
			throw err;
		}
		return body.data ?? body;
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

// GET /roles?page=&size=&name=
export const getRoles = async ({ page = 1, limit = 10, sort, filters = {} } = {}) => {
	try {
		const size = Number(limit) > 0 ? Number(limit) : 10;
		const params = {
			...(filters?.name ? { name: filters.name } : {}),
			page,
			size,
			...(sort ? { sort } : {}),
		};
		const res = await axios.get(`${API_URL}/roles`, {
			params,
			headers: { Authorization: `Bearer ${getToken()}` },
		});
		const data = unwrap(res) ?? {};
		const items = Array.isArray(data.content) ? data.content : [];
		const currentPage = Number(data.number ?? page - 1) + 1;
		const totalPages = Number(data.totalPages ?? 0);
		const totalElements = Number(data.totalElements ?? items.length ?? 0);
		const pageSize = Number(data.size ?? size);
		const numberOfElements = Number(data.numberOfElements ?? items.length ?? 0);
		const fallbackIsLast = totalPages <= 1 || currentPage >= totalPages;
		return {
			items,
			total: totalElements,
			page: currentPage,
			size: pageSize,
			totalPages,
			meta: {
				first: Boolean(data.first ?? currentPage <= 1),
				last: Boolean(data.last ?? fallbackIsLast),
				totalElements,
				numberOfElements,
				currentPage,
				pageSize,
				totalPages,
			},
		};
	} catch (err) {
		rethrow(err);
	}
};

// Get role by id
export const getRoleById = async (id) => {
	try {
		const res = await axios.get(`${API_URL}/roles/${id}`, {
			headers: { Authorization: `Bearer ${getToken()}` },
		});
		return unwrap(res);
	} catch (err) {
		rethrow(err);
	}
};

// Create role
export const createRole = async (role) => {
	try {
		const res = await axios.post(`${API_URL}/roles`, role, {
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
		});
		return unwrap(res);
	} catch (err) {
		rethrow(err);
	}
};

// Update role
export const updateRole = async (id, role) => {
	try {
		const res = await axios.put(`${API_URL}/roles/${id}`, role, {
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
		});
		return unwrap(res);
	} catch (err) {
		rethrow(err);
	}
};

// Delete role
export const deleteRole = async (id) => {
	try {
		const res = await axios.delete(`${API_URL}/roles/${id}`, {
			headers: { Authorization: `Bearer ${getToken()}` },
		});
		return unwrap(res);
	} catch (err) {
		rethrow(err);
	}
};
