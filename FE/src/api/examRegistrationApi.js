import axios from 'axios'

const API_URL = import.meta.env.VITE_API_BASE_URL
const getToken = () => localStorage.getItem('access_token')

const authHeaders = (includeJson = false) => ({
  ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
  Authorization: `Bearer ${getToken()}`,
})

const unwrap = (res) => {
  const body = res?.data
  if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'success')) {
    if (body.success === false) {
      const msg = body.message || 'Request failed'
      const err = new Error(msg)
      err.response = { status: res?.status, data: body }
      throw err
    }
    return body.data ?? body
  }
  return body
}

const rethrow = (err) => {
  if (err?.response) {
    const { status, data } = err.response
    let message = typeof data === 'string' ? data : data?.message || err.message || 'Request failed'

    if (status === 401) message = 'Unauthorized. Please login again.'
    if (status === 403) message = 'Access denied. You do not have permission.'

    const wrapped = new Error(message)
    wrapped.response = err.response
    throw wrapped
  }

  throw err
}

// GET /exam-registrations/{id}
export const getExamRegistrationById = async (id) => {
  try {
    const res = await axios.get(`${API_URL}/exam-registrations/${id}`, {
      headers: authHeaders(),
    })
    return unwrap(res)
  } catch (err) {
    rethrow(err)
  }
}

// GET /exam-registrations?examId=&page=&size=
export const getExamRegistrationsByExam = async ({ examId, page = 1, size = 10 }) => {
  try {
    const res = await axios.get(`${API_URL}/exam-registrations`, {
      params: { examId, page, size },
      headers: authHeaders(),
    })
    return unwrap(res)
  } catch (err) {
    rethrow(err)
  }
}

// POST /exam-registrations/single?userId=&examId=
export const addUserToExam = async ({ userId, examId }) => {
  try {
    const res = await axios.post(`${API_URL}/exam-registrations/single`, null, {
      params: { userId, examId },
      headers: authHeaders(),
    })
    return unwrap(res)
  } catch (err) {
    rethrow(err)
  }
}

// POST /exam-registrations/batch
// ADMIN flow: add a list of users to one exam.
export const addUsersToExam = async ({ examId, userIds }) => {
  try {
    const res = await axios.post(
      `${API_URL}/exam-registrations/batch`,
      { examId, userIds },
      {
        headers: authHeaders(true),
      },
    )
    return unwrap(res)
  } catch (err) {
    rethrow(err)
  }
}

// DELETE /exam-registrations?userId=&examId=
export const removeUserFromExam = async ({ userId, examId }) => {
  try {
    const res = await axios.delete(`${API_URL}/exam-registrations`, {
      params: { userId, examId },
      headers: authHeaders(),
    })
    return unwrap(res)
  } catch (err) {
    rethrow(err)
  }
}

// GET /exam-registrations/check?userId=&examId=
export const checkUserExamRegistration = async ({ userId, examId }) => {
  try {
    const res = await axios.get(`${API_URL}/exam-registrations/check`, {
      params: { userId, examId },
      headers: authHeaders(),
    })
    return Boolean(unwrap(res))
  } catch (err) {
    rethrow(err)
  }
}

// GET /exam-registrations/my-exams?page=&size=
export const getMyExamRegistrations = async ({ page = 1, size = 10 } = {}) => {
  try {
    const res = await axios.get(`${API_URL}/exam-registrations/my-exams`, {
      params: { page, size },
      headers: authHeaders(),
    })
    return unwrap(res)
  } catch (err) {
    rethrow(err)
  }
}
