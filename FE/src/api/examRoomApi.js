import axios from 'axios'
import { dedupeGet } from './requestCache'

const API_URL = import.meta.env.VITE_API_BASE_URL
const getToken = () => localStorage.getItem('access_token')

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

export const getExamRoomById = async (roomId) => {
  const parsedRoomId = Number(roomId)
  if (!Number.isInteger(parsedRoomId) || parsedRoomId <= 0) {
    throw new Error('Invalid room id')
  }

  try {
    const res = await dedupeGet(axios, `${API_URL}/exam-rooms/${parsedRoomId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    return unwrap(res)
  } catch (err) {
    rethrow(err)
  }
}

export const createExamRoom = async (room) => {
  try {
    const res = await axios.post(`${API_URL}/exam-rooms`, room, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
    })
    return unwrap(res)
  } catch (err) {
    rethrow(err)
  }
}

export const updateExamRoom = async (roomId, room) => {
  const parsedRoomId = Number(roomId)
  if (!Number.isInteger(parsedRoomId) || parsedRoomId <= 0) {
    throw new Error('Invalid room id')
  }

  try {
    const res = await axios.put(`${API_URL}/exam-rooms/${parsedRoomId}`, room, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
    })
    return unwrap(res)
  } catch (err) {
    rethrow(err)
  }
}

export const deleteExamRoom = async (roomId) => {
  const parsedRoomId = Number(roomId)
  if (!Number.isInteger(parsedRoomId) || parsedRoomId <= 0) {
    throw new Error('Invalid room id')
  }

  try {
    const res = await axios.delete(`${API_URL}/exam-rooms/${parsedRoomId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    return unwrap(res)
  } catch (err) {
    rethrow(err)
  }
}

export const assignExamRoom = async ({ registrationId, roomId, seat }) => {
  const parsedRegistrationId = Number(registrationId)
  const parsedRoomId = Number(roomId)
  const parsedSeat = Number(seat)

  if (!Number.isInteger(parsedRegistrationId) || parsedRegistrationId <= 0) {
    throw new Error('Invalid registration id')
  }

  if (!Number.isInteger(parsedRoomId) || parsedRoomId <= 0) {
    throw new Error('Invalid room id')
  }

  if (!Number.isInteger(parsedSeat) || parsedSeat <= 0) {
    throw new Error('Invalid seat number')
  }

  try {
    const res = await axios.post(
      `${API_URL}/exam-rooms/assign`,
      null,
      {
        params: {
          registrationId: parsedRegistrationId,
          roomId: parsedRoomId,
          seat: parsedSeat,
        },
        headers: { Authorization: `Bearer ${getToken()}` },
      },
    )
    return unwrap(res)
  } catch (err) {
    rethrow(err)
  }
}

export const assignExamRoomBatch = async ({ roomId, students }) => {
  const parsedRoomId = Number(roomId)
  const normalizedStudents = Array.isArray(students)
    ? students
        .map((student) => ({
          registrationId: Number(student?.registrationId),
          seatNumber: Number(student?.seatNumber),
        }))
        .filter((student) => Number.isInteger(student.registrationId) && student.registrationId > 0 && Number.isInteger(student.seatNumber) && student.seatNumber > 0)
    : []

  if (!Number.isInteger(parsedRoomId) || parsedRoomId <= 0) {
    throw new Error('Invalid room id')
  }

  if (normalizedStudents.length === 0) {
    throw new Error('Please add at least one student to assign')
  }

  try {
    const res = await axios.post(
      `${API_URL}/exam-rooms/assign-batch`,
      {
        roomId: parsedRoomId,
        students: normalizedStudents,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
      },
    )
    return unwrap(res)
  } catch (err) {
    rethrow(err)
  }
}

export const getStudentsInRoom = async ({ roomId, page = 0, size = 20 }) => {
  const parsedRoomId = Number(roomId)
  const parsedPage = Math.max(0, Number(page) || 0)
  const parsedSize = Math.max(1, Number(size) || 20)

  if (!Number.isInteger(parsedRoomId) || parsedRoomId <= 0) {
    throw new Error('Invalid room id')
  }

  try {
    const res = await dedupeGet(axios, `${API_URL}/exam-rooms/${parsedRoomId}/students`, {
      params: {
        page: parsedPage,
        size: parsedSize,
      },
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    const data = unwrap(res)
    return data || { content: [], totalElements: 0, totalPages: 0, empty: true }
  } catch (err) {
    rethrow(err)
  }
}

export const getRoomsByExamPaginated = async (examId, page = 0, size = 10) => {
  const parsedExamId = Number(examId)
  const parsedPage = Math.max(0, Number(page) || 0)
  const parsedSize = Math.max(1, Number(size) || 10)

  if (!Number.isInteger(parsedExamId) || parsedExamId <= 0) return { content: [], totalElements: 0, totalPages: 0, empty: true }

  try {
    const res = await dedupeGet(axios, `${API_URL}/exam-rooms`, {
      params: {
        examId: parsedExamId,
        page: parsedPage,
        size: parsedSize,
      },
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    const data = unwrap(res)
    return data || { content: [], totalElements: 0, totalPages: 0, empty: true }
  } catch (err) {
    rethrow(err)
  }
}
