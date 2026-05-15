import axiosClient from '../services/axiosClient'
import { getExamSessionById } from './examSessionApi'

const API_URL = import.meta.env.VITE_API_BASE_URL

const normalizeVerifyResponse = (response) => {
  if (!response) return null

  if (typeof response === 'boolean') {
    return { passed: response }
  }

  if (typeof response === 'object') {
    return response
  }

  return { passed: Boolean(response) }
}

export const verifyCccd = async () => {
  // verifyCccd called but verification is handled externally; stubbed.
  return null
}

export const verifyIdentity = async (request) => {
  // Defensive pre-check: if backend already marked session as pending/review/blocked,
  // avoid calling /verify to prevent unnecessary requests after max failures.
  const sessionId = request?.examSessionId
  if (sessionId) {
    try {
      const session = await getExamSessionById(sessionId)
      const sessionStatus = String(session?.examSessionStatus || session?.status || '').toUpperCase()
      if (
        sessionStatus === 'PENDING_REVIEW' ||
        sessionStatus === 'PENDING_DEVICE_APPROVAL' ||
        sessionStatus === 'BLOCKED' ||
        sessionStatus === 'NOT_ACTIVE'
      ) {
        return { passed: false, sessionStatus, error: 'SESSION_INACTIVE_OR_PENDING' }
      }
    } catch (err) {
      // If pre-check fails, continue to call verify (we don't want to block for transient GET errors)
      // verifyIdentity pre-check session status failed (suppressed)
    }
  }

  try {
    const response = await axiosClient.post(`${API_URL}/verify`, request)
    return normalizeVerifyResponse(response)
  } catch (err) {
    // If backend reports session not active, return a normalized object instead of throwing
    const status = err?.status
    const message = err?.response?.data?.message || err?.message || ''
    if (status === 400 && /session not active/i.test(message)) {
      return { passed: false, sessionStatus: 'NOT_ACTIVE', error: 'SESSION_NOT_ACTIVE', message }
    }
    throw err
  }
}

export const readCccd = async () => {
  // readCccd called but verification is handled externally; stubbed.
  return null
}
