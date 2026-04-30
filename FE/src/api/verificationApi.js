import axiosClient from '../services/axiosClient'

const API_URL = import.meta.env.VITE_API_BASE_URL

const unwrap = (res) => {
  const body = res?.data
  if (body && typeof body === 'object') {
    if (Object.prototype.hasOwnProperty.call(body, 'data') && (Object.prototype.hasOwnProperty.call(body, 'code') || Object.prototype.hasOwnProperty.call(body, 'message'))) {
      return body.data
    }
    if (Object.prototype.hasOwnProperty.call(body, 'success')) {
      if (body.success === false) {
        const message = body.message || 'Request failed'
        const err = new Error(message)
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

export const verifyCccd = async () => {
  try {
    return await axiosClient.post(`${API_URL}/cccd/verify`, null)
  } catch (err) {
    rethrow(err)
  }
}

export const verifyIdentity = async (request) => {
  try {
    return await axiosClient.post(`${API_URL}/verify`, request)
  } catch (err) {
    rethrow(err)
  }
}

export const readCccd = async () => {
  try {
    return await axiosClient.post(`${API_URL}/cccd/read`, null)
  } catch (err) {
    rethrow(err)
  }
}
