import { useCallback, useRef, useState } from 'react'
import { verifyIdentity } from '../api/verificationApi'
import { captureFrame, getDeviceInfo } from '../utils/faceCapture'

/**
 * Hook for managing exam verification
 */
export const useExamVerification = (examSessionId) => {
  const videoRef = useRef(null)
  const [verificationState, setVerificationState] = useState('idle') // idle, verifying, success, failed
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [failureCount, setFailureCount] = useState(0)

  /**
   * Perform verification (INITIAL or RANDOM)
   */
  const verify = useCallback(
    async (type = 'INITIAL') => {
      if (!videoRef.current) {
        setError('Camera not available')
        return null
      }

      try {
        setVerificationState('verifying')
        setError('')

        const captureImage = captureFrame(videoRef.current)
        const deviceInfo = getDeviceInfo()

        const response = await verifyIdentity({
          examSessionId,
          captureImage,
          type,
          ...deviceInfo,
        })

        setResult(response)

        // backend may return { reconnect: true } for trusted reconnects
        const isReconnect = Boolean(response?.reconnect)
        const status = String(response?.sessionStatus || '').toUpperCase()
        const isTerminalBlocked = status === 'BLOCKED'
        const isPendingReview =
          status === 'PENDING_REVIEW' ||
          status === 'PENDING_DEVICE_APPROVAL' ||
          status === 'PENDING_VERIFY_REVIEW'
        const isPassed = Boolean(response?.passed) || isReconnect
        const backendAttempt = Number.isInteger(response?.attempt) ? response.attempt : null

        if (backendAttempt !== null) {
          setFailureCount(backendAttempt)
        }

        if (isTerminalBlocked) {
          setVerificationState('failed')
          setError(response?.message || 'Phiên thi đã bị khóa')
          return response
        }

        if (isPendingReview) {
          setVerificationState('failed')
          setError(response?.message || 'Phiên thi đang chờ giám thị xác nhận')
          return response
        }

        if (isPassed) {
          setVerificationState('success')
          if (backendAttempt === null) {
            setFailureCount(0)
          }
          return response
        } else {
          setVerificationState('failed')
          return response
        }
      } catch (err) {
        setError(err.message || 'Verification failed')
        setVerificationState('failed')
        return null
      }
    },
    [examSessionId]
  )

  /**
   * Reset verification state
   */
  const reset = useCallback(() => {
    setVerificationState('idle')
    setResult(null)
    setError('')
    setFailureCount(0)
  }, [])

  /**
   * Set video reference
   */
  const setVideoRef = useCallback((ref) => {
    videoRef.current = ref
  }, [])

  return {
    verify,
    reset,
    setVideoRef,
    verificationState,
    result,
    error,
    failureCount,
  }
}

/**
 * Hook for managing periodic verification
 */
export const usePeriodicVerification = (examSessionId, options = {}) => {
  const {
    interval = 30000,
    randomize = true,
    maxFailures = 2,
    onSuccess = () => {},
    onFailure = () => {},
  } = options

  const timerRef = useRef(null)
  const [isActive, setIsActive] = useState(false)
  const [failureCount, setFailureCount] = useState(0)
  const verification = useExamVerification(examSessionId)

  /**
   * Start periodic verification
   */
  const start = useCallback(async () => {
    setIsActive(true)

    const scheduleVerification = async () => {
      let delay = interval

      if (randomize) {
        const variance = interval * 0.5
        delay = interval + (Math.random() - 0.5) * variance
      }

      timerRef.current = setTimeout(async () => {
        const response = await verification.verify('RANDOM')
        const passed = Boolean(response?.passed) || Boolean(response?.reconnect)

        if (passed) {
          onSuccess?.()
        } else {
          const newFailureCount = Number.isInteger(response?.attempt) ? response.attempt : failureCount + 1
          setFailureCount(newFailureCount)

          if (newFailureCount >= maxFailures) {
            onFailure?.({ reason: 'MAX_FAILURES', count: newFailureCount })
            return // Stop scheduling
          }

          onFailure?.({ reason: 'VERIFICATION_FAILED', count: newFailureCount })
        }

        // Schedule next verification if still active
        if (isActive) {
          scheduleVerification()
        }
      }, delay)
    }

    scheduleVerification()
  }, [interval, randomize, verification, failureCount, maxFailures, onSuccess, onFailure, isActive])

  /**
   * Stop periodic verification
   */
  const stop = useCallback(() => {
    setIsActive(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
  }, [])

  /**
   * Reset
   */
  const reset = useCallback(() => {
    stop()
    setFailureCount(0)
    verification.reset()
  }, [stop, verification])

  return {
    start,
    stop,
    reset,
    isActive,
    failureCount,
    ...verification,
  }
}
