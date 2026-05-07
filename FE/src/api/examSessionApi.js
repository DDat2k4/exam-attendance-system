import axiosClient from '../services/axiosClient'
import { dedupeGet } from './requestCache'

const API_URL = import.meta.env.VITE_API_BASE_URL

const unwrap = (res) => {
  const body = res?.data
  if (body && typeof body === 'object') {
    if (Object.prototype.hasOwnProperty.call(body, 'data') && (Object.prototype.hasOwnProperty.call(body, 'code') || Object.prototype.hasOwnProperty.call(body, 'message'))) {
      return body.data
    }
    if (Object.prototype.hasOwnProperty.call(body, 'success')) {
      if (body.success === false) {
        const msg = body.message || 'Request failed'
        const err = new Error(msg)
        err.response = { status: res?.status, data: body }
        throw err
      }
      return body.data ?? body
    }
  }
  return body
}

const rethrow = (err) => {
  if (err?.response) {
    const { status, data } = err.response
    let message = typeof data === 'string' ? data : data?.message || err.message || 'Request failed'

    if (status === 401) message = 'Unauthorized. Please login again.'
    if (status === 403) message = 'Action is not available for this account.'

    const wrapped = new Error(message)
    wrapped.response = err.response
    throw wrapped
  }

  throw err
}

const normalizePageResponse = (data) => {
  if (!data) {
    return { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 }
  }

  if (Array.isArray(data)) {
    return {
      content: data,
      totalElements: data.length,
      totalPages: 1,
      number: 0,
      size: data.length || 20,
    }
  }

  const content = Array.isArray(data.content)
    ? data.content
    : Array.isArray(data.rows)
      ? data.rows
      : Array.isArray(data.items)
        ? data.items
        : []

  return {
    ...data,
    content,
    totalElements: data.totalElements ?? data.total ?? content.length,
    totalPages: data.totalPages ?? 1,
    number: data.number ?? data.page ?? 0,
    size: data.size ?? content.length ?? 20,
  }
}

const normalizeHistoryResponse = (data) => {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.content)) return data.content
  if (Array.isArray(data.rows)) return data.rows
  if (Array.isArray(data.items)) return data.items
  return [data]
}

export const startExamSession = async ({ examId, deviceId }) => {
  try {
    return await axiosClient.post(
      `${API_URL}/exam-sessions/start`,
      { examId, deviceId },
    )
  } catch (err) {
    rethrow(err)
  }
}

export const endExamSession = async (sessionId) => {
  try {
    return await axiosClient.post(`${API_URL}/exam-sessions/${sessionId}/end`, null)
  } catch (err) {
    rethrow(err)
  }
}

export const getExamSessionById = async (sessionId) => {
  try {
    return await dedupeGet(axiosClient, `${API_URL}/exam-sessions/${sessionId}`)
  } catch (err) {
    rethrow(err)
  }
}

export const getAllExamSessions = async () => {
  try {
    const data = await dedupeGet(axiosClient, `${API_URL}/exam-sessions`)
    return Array.isArray(data) ? data : []
  } catch (err) {
    rethrow(err)
  }
}

export const getMyExamSessions = async () => {
  try {
    const data = await dedupeGet(axiosClient, `${API_URL}/exam-sessions/me`)
    return Array.isArray(data) ? data : []
  } catch (err) {
    rethrow(err)
  }
}

export const getMyRoomInfo = async (examId) => {
  try {
    return await dedupeGet(axiosClient, `${API_URL}/exam-sessions/me/room`, {
      params: { examId },
    })
  } catch (err) {
    rethrow(err)
  }
}

export const getExamSessionDashboard = async (params = {}) => {
  const { roomId, status, riskLevel, flagged, keyword, page = 0, size = 20 } = params
  const parsedRoomId = Number(roomId)
  if (!Number.isInteger(parsedRoomId) || parsedRoomId <= 0) {
    return { content: [], totalElements: 0, totalPages: 0 }
  }

  try {
    const res = await dedupeGet(axiosClient, `${API_URL}/exam-sessions/dashboard`, {
      params: {
        roomId: parsedRoomId,
        page,
        size,
        ...(status !== undefined && status !== null && status !== '' ? { status } : {}),
        ...(riskLevel !== undefined && riskLevel !== null && riskLevel !== '' ? { riskLevel } : {}),
        ...(flagged !== undefined && flagged !== null && flagged !== '' ? { flagged } : {}),
        ...(keyword ? { keyword } : {}),
      },
    })
    return normalizePageResponse(res)
  } catch (err) {
    rethrow(err)
  }
}

export const flagExamSession = async (sessionId, reason) => {
  try {
    return await axiosClient.post(`${API_URL}/exam-sessions/${sessionId}/flag`, null, {
      params: { reason },
    })
  } catch (err) {
    rethrow(err)
  }
}

export const unflagExamSession = async (sessionId) => {
  try {
    return await axiosClient.post(`${API_URL}/exam-sessions/${sessionId}/unflag`, null)
  } catch (err) {
    rethrow(err)
  }
}

export const approveExamSession = async (sessionId) => {
  try {
    return await axiosClient.post(`${API_URL}/exam-sessions/${sessionId}/approve`, null)
  } catch (err) {
    rethrow(err)
  }
}

export const rejectExamSession = async (sessionId, reason) => {
  try {
    return await axiosClient.post(`${API_URL}/exam-sessions/${sessionId}/reject`, null, {
      params: { reason },
    })
  } catch (err) {
    rethrow(err)
  }
}

export const getExamSessionVerificationHistory = async (sessionId) => {
  try {
    const res = await dedupeGet(axiosClient, `${API_URL}/exam-sessions/${sessionId}/verifications`)
    return normalizeHistoryResponse(res)
  } catch (err) {
    rethrow(err)
  }
}
