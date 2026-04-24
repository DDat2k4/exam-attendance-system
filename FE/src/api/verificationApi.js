import axios from 'axios'

const API_URL = import.meta.env.VITE_API_BASE_URL
const getToken = () => localStorage.getItem('access_token')

const unwrap = (res) => {
  const body = res?.data
  if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'success')) {
    if (body.success === false) {
      const message = body.message || 'Request failed'
      const err = new Error(message)
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
    if (status === 403) message = 'Action is not available for this account.'

    const wrapped = new Error(message)
    wrapped.response = err.response
    throw wrapped
  }

  throw err
}

export const verifyCccd = async () => {
  try {
    const res = await axios.post(`${API_URL}/cccd/verify`, null, {
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

export const verifyIdentity = async (request) => {
  try {
    const res = await axios.post(`${API_URL}/verify`, request, {
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

export const readCccd = async () => {
  try {
    const res = await axios.post(`${API_URL}/cccd/read`, null, {
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
