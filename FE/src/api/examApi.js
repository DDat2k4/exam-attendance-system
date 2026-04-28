import axios from "axios";
import { dedupeGet } from "./requestCache";

const API_URL = import.meta.env.VITE_API_BASE_URL;
const getToken = () => localStorage.getItem("access_token");
const authHeaders = (includeJson = false) => ({
	...(includeJson ? { "Content-Type": "application/json" } : {}),
	Authorization: `Bearer ${getToken()}`,
});

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

const normalizeExamPage = (data, fallbackPage = 0, fallbackSize = 10) => {
	if (!data || typeof data !== "object") {
		return {
			content: [],
			number: fallbackPage,
			size: fallbackSize,
			totalElements: 0,
			totalPages: 0,
		};
	}

	if (Array.isArray(data)) {
		return {
			content: data,
			number: fallbackPage,
			size: fallbackSize,
			totalElements: data.length,
			totalPages: data.length > 0 ? 1 : 0,
		};
	}

	return {
		content: Array.isArray(data.content) ? data.content : [],
		number: Number.isInteger(data.number) ? data.number : fallbackPage,
		size: Number.isInteger(data.size) ? data.size : fallbackSize,
		totalElements: Number.isInteger(data.totalElements) ? data.totalElements : 0,
		totalPages: Number.isInteger(data.totalPages) ? data.totalPages : 0,
	};
};

const hydrateExamDetails = async (list) => {
	if (!Array.isArray(list) || list.length === 0) return [];

	const hydrated = await Promise.all(
		list.map(async (item) => {
			if (Array.isArray(item?.rooms)) return item;

			try {
				const detailRes = await dedupeGet(axios, `${API_URL}/exams/${item.id}`, {
					headers: authHeaders(),
				});
				const detail = unwrap(detailRes);
				return detail ?? item;
			} catch {
				return item;
			}
		}),
	);

	return hydrated;
};

// Create exam
export const createExam = async (exam) => {
	try {
		const res = await axios.post(`${API_URL}/exams`, exam, {
			headers: authHeaders(true),
		});
		return unwrap(res);
	} catch (err) {
		rethrow(err);
	}
};

// Update exam
export const updateExam = async (examId, exam) => {
	try {
		const res = await axios.put(`${API_URL}/exams/${examId}`, exam, {
			headers: authHeaders(true),
		});
		return unwrap(res);
	} catch (err) {
		rethrow(err);
	}
};

// Delete exam
export const deleteExam = async (examId) => {
	try {
		const res = await axios.delete(`${API_URL}/exams/${examId}`, {
			headers: authHeaders(),
		});
		return unwrap(res);
	} catch (err) {
		rethrow(err);
	}
};

// Get exams with pagination and optional keyword filter.
export const getExamsPaginated = async ({ page = 0, size = 10, keyword = "", hydrateRooms = false } = {}) => {
	const safePage = Math.max(0, Number(page) || 0);
	const safeSize = Math.max(1, Number(size) || 10);

	try {
		const res = await dedupeGet(axios, `${API_URL}/exams`, {
			params: {
				page: safePage,
				size: safeSize,
				...(String(keyword || "").trim() ? { keyword: String(keyword).trim() } : {}),
			},
			headers: authHeaders(),
		});
		const pageData = normalizeExamPage(unwrap(res), safePage, safeSize);

		if (!hydrateRooms || pageData.content.length === 0) {
			return pageData;
		}

		const hydratedContent = await hydrateExamDetails(pageData.content);
		return { ...pageData, content: hydratedContent };
	} catch (err) {
		rethrow(err);
	}
};

// Get all exams (compatibility helper for pages that need full exam list)
export const getAllExams = async ({ size = 100, keyword = "", hydrateRooms = true } = {}) => {
	const safeSize = Math.max(1, Number(size) || 100);
	try {
		const first = await getExamsPaginated({ page: 0, size: safeSize, keyword, hydrateRooms });
		const totalPages = first?.totalPages ?? 0;
		if (totalPages <= 1) {
			return Array.isArray(first?.content) ? first.content : [];
		}

		const restPages = await Promise.all(
			Array.from({ length: totalPages - 1 }, (_, idx) =>
				getExamsPaginated({ page: idx + 1, size: safeSize, keyword, hydrateRooms }),
			),
		);

		return [
			...(Array.isArray(first?.content) ? first.content : []),
			...restPages.flatMap((p) => (Array.isArray(p?.content) ? p.content : [])),
		];
	} catch (err) {
		rethrow(err);
	}
};

// Get exam by id
export const getExamById = async (examId) => {
	try {
		const res = await dedupeGet(axios, `${API_URL}/exams/${examId}`, {
			headers: authHeaders(),
		});
		return unwrap(res);
	} catch (err) {
		rethrow(err);
	}
};

// Create exam room
export const createExamRoom = async (examId, room) => {
	try {
		const res = await axios.post(`${API_URL}/exams/${examId}/rooms`, room, {
			headers: authHeaders(true),
		});
		return unwrap(res);
	} catch (err) {
		rethrow(err);
	}
};

// Delete exam room
export const deleteExamRoom = async (roomId) => {
	try {
		const res = await axios.delete(`${API_URL}/exams/rooms/${roomId}`, {
			headers: authHeaders(),
		});
		return unwrap(res);
	} catch (err) {
		rethrow(err);
	}
};

