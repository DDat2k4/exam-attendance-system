import { useCallback, useEffect, useRef, useState } from 'react'
import { requestCameraAccess, captureFrame, getDeviceInfo } from '../../utils/faceCapture'
import { verifyIdentity } from '../../api/verificationApi'
import { getExamSessionById } from '../../api/examSessionApi'
import { isApprovedSessionStatus, normalizeSessionStatus } from '../../utils/examSessionStatus'
import './ExamProctor.css'

export default function ExamProctor({ examSessionId, onSessionEnd, questions = [], verificationWaiting = false, verificationClearedAt = null, externalFailures = 0 }) {
  const videoRef = useRef(null)
  const randomTimeoutRef = useRef(null)
  const cameraPromptTimeoutRef = useRef(null)
  const countdownIntervalRef = useRef(null)
  const prevVerificationWaitingRef = useRef(verificationWaiting)
  const [cameraActive, setCameraActive] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState('idle') // idle, verifying, success, failed
  const [lastVerification, setLastVerification] = useState(null)
  const [totalFailures, setTotalFailures] = useState(0)
  const [verificationLog, setVerificationLog] = useState([])
  const [examTime, setExamTime] = useState(0)
  const [showCamera, setShowCamera] = useState(false)
  const [randomCountdown, setRandomCountdown] = useState(null)
  const [awaitingReview, setAwaitingReview] = useState(false)
  const [ignoreExternalUntil, setIgnoreExternalUntil] = useState(0)
  const streamRef = useRef(null)
  const showCameraRef = useRef(false)

  const RANDOM_MIN_INTERVAL = 10000 // 10 seconds
  const RANDOM_MAX_INTERVAL = 40000 // 40 seconds
  const RANDOM_COUNTDOWN_MIN = 3 // 3 seconds
  const RANDOM_COUNTDOWN_MAX = 5 // 5 seconds
  const CAMERA_PROMPT_DURATION = 6000 // keep camera visible after capture for random checks
  const MAX_FAILURES = 3
  const EXAM_DURATION = 3600 // 1 hour in seconds

  useEffect(() => {
    showCameraRef.current = showCamera
  }, [showCamera])

  const registerFailure = useCallback(
    (nextStatus = 'failed') => {
      setVerificationStatus(nextStatus)
      setTotalFailures((prev) => {
        const newFailures = prev + 1
        if (newFailures >= MAX_FAILURES) {
          setVerificationStatus('needs_review')
          setAwaitingReview(true)
        } else {
          setTimeout(() => setVerificationStatus('idle'), 2500)
        }

        return newFailures
      })
    },
    [onSessionEnd],
  )

  // Initialize camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await requestCameraAccess()
        streamRef.current = stream
        setCameraActive(true)

        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        console.error('Camera error:', err.message)
        setCameraActive(false)
        registerFailure('failed')
      }
    }

    initCamera()

    return () => {
      if (randomTimeoutRef.current) {
        clearTimeout(randomTimeoutRef.current)
      }
      if (cameraPromptTimeoutRef.current) {
        clearTimeout(cameraPromptTimeoutRef.current)
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [registerFailure])

  // Attach stream whenever the preview video is mounted/shown.
  useEffect(() => {
    if (!videoRef.current || !streamRef.current) return
    if (videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [showCamera])

  // Poll session status while awaiting review — auto exit if proctor approves
  useEffect(() => {
    if (!awaitingReview || !examSessionId) return

    const pollInterval = setInterval(async () => {
      try {
        const session = await getExamSessionById(examSessionId)
        const sessionStatus = normalizeSessionStatus(session?.examSessionStatus)

        // If proctor approved (status changed to CHECKED_IN/IN_PROGRESS), exit waiting state
        if (isApprovedSessionStatus(sessionStatus) || sessionStatus === 'NOT_STARTED') {
          
          setAwaitingReview(false)
          // reset failures so random checks can resume normally
          setTotalFailures(0)
          setVerificationStatus('idle')
          // temporarily ignore externalFailures updates to avoid immediate re-sync
          setIgnoreExternalUntil(Date.now() + 3000)
        }
      } catch (err) {
        console.error('Error polling session status:', err.message)
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(pollInterval)
  }, [awaitingReview, examSessionId])

  // Log awaitingReview changes
  useEffect(() => {}, [awaitingReview])

  // If parent signals verification cleared (timestamp changed), reset local failure counter and logs
  useEffect(() => {
    if (!verificationClearedAt) return
    setAwaitingReview(false)
    setTotalFailures(0)
    setVerificationStatus('idle')
    setVerificationLog([])
  }, [verificationClearedAt])

  // Sync external failures reported by initial verification flow
  useEffect(() => {
    if (!externalFailures) return
    // If we recently cleared (proctor approved), ignore external updates for a short window
    if (Date.now() < ignoreExternalUntil) {
      return
    }
    setTotalFailures((prev) => {
      if (externalFailures > prev) return externalFailures
      return prev
    })
    if (externalFailures >= MAX_FAILURES) {
      setVerificationStatus('needs_review')
      if (verificationWaiting) {
        setAwaitingReview(true)
      }
    }
  }, [externalFailures, verificationWaiting, ignoreExternalUntil])

  // Log combined failures for debugging display issues
  useEffect(() => {}, [totalFailures, externalFailures])
  useEffect(() => {
    if (prevVerificationWaitingRef.current === true && verificationWaiting === false && awaitingReview) {
      setAwaitingReview(false)
      setTotalFailures(0)
      setVerificationStatus('idle')
    }

    prevVerificationWaitingRef.current = verificationWaiting
  }, [verificationWaiting, awaitingReview])

  const combinedFailures = Math.max(totalFailures, externalFailures)
  const displayedStatus = awaitingReview ? 'needs_review' : verificationStatus

  // Start exam timer
  useEffect(() => {
    const timer = setInterval(() => {
      setExamTime((prev) => {
        if (prev >= EXAM_DURATION) {
          clearInterval(timer)
          onSessionEnd?.('TIME_UP')
          return prev
        }
        return prev + 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [onSessionEnd])

  // Perform verification
  const performRandomVerification = useCallback(async () => {
    const combinedFailures = Math.max(totalFailures, externalFailures)
    if (!videoRef.current || !cameraActive || awaitingReview || (combinedFailures >= MAX_FAILURES && verificationWaiting)) {
    
      return
    }

    try {
      setVerificationStatus('verifying')

      const captureImage = captureFrame(videoRef.current)
      const deviceInfo = getDeviceInfo()

      const response = await verifyIdentity({
        examSessionId,
        captureImage,
        type: 'RANDOM',
        ...deviceInfo,
      })

      const logEntry = {
        timestamp: new Date().toLocaleTimeString(),
        type: 'RANDOM',
        passed: response.passed,
        confidence: response.confidence,
        attempt: response.attempt,
        sessionStatus: response.sessionStatus,
        reconnect: response.reconnect,
      }

      setVerificationLog((prev) => [...prev, logEntry])
      setLastVerification(response)

      // Respect backend sessionStatus: backend may set PENDING_REVIEW or PENDING_DEVICE_APPROVAL.
      const status = (response.sessionStatus || '').toUpperCase()
      const isReconnect = Boolean(response?.reconnect)

      if (isReconnect) {
        setVerificationStatus('success')
        setAwaitingReview(false)
        setTimeout(() => setVerificationStatus('idle'), 2000)
        return
      }

      if (status === 'BLOCKED') {
        setVerificationStatus('blocked')
        setAwaitingReview(false)
        // backend blocked the session; end locally
        onSessionEnd?.('BLOCKED')
        return
      }

      if (status === 'PENDING_REVIEW' || status === 'PENDING_DEVICE_APPROVAL') {
        // backend flagged session — show proctor notice, do not auto-block
        setVerificationStatus('needs_review')
        registerFailure('needs_review')
        if (verificationWaiting) {
          setAwaitingReview(true)
        }
        return
      }

      if (response.passed) {
        setVerificationStatus('success')
        setAwaitingReview(false)
        setTimeout(() => setVerificationStatus('idle'), 2000)
      } else {
        registerFailure('failed')
      }
    } catch (err) {
      console.error('Verification error:', err.message)
      registerFailure('failed')
    }
  }, [cameraActive, examSessionId, registerFailure, totalFailures, externalFailures, awaitingReview, verificationWaiting])

  const scheduleNextRandomVerification = useCallback(function scheduleNextRandomVerificationImpl() {
    const combinedFailures = Math.max(totalFailures, externalFailures)
    if ((combinedFailures >= MAX_FAILURES && verificationWaiting) || !cameraActive || awaitingReview) return

    const delay =
      Math.floor(Math.random() * (RANDOM_MAX_INTERVAL - RANDOM_MIN_INTERVAL + 1)) + RANDOM_MIN_INTERVAL

    randomTimeoutRef.current = setTimeout(async () => {
      const countdownSeconds =
        Math.floor(Math.random() * (RANDOM_COUNTDOWN_MAX - RANDOM_COUNTDOWN_MIN + 1)) + RANDOM_COUNTDOWN_MIN

      // Random check should briefly force camera visibility for proctoring transparency.
      const shouldAutoClose = !showCameraRef.current
      setShowCamera(true)
      setVerificationStatus('countdown')
      setRandomCountdown(countdownSeconds)

      if (cameraPromptTimeoutRef.current) {
        clearTimeout(cameraPromptTimeoutRef.current)
      }
      if (shouldAutoClose) {
        cameraPromptTimeoutRef.current = setTimeout(() => {
          setShowCamera(false)
        }, countdownSeconds * 1000 + CAMERA_PROMPT_DURATION)
      }

      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }

      let remaining = countdownSeconds
      countdownIntervalRef.current = setInterval(async () => {
        remaining -= 1
        setRandomCountdown(remaining)

        if (remaining <= 0) {
          clearInterval(countdownIntervalRef.current)
          countdownIntervalRef.current = null
          setRandomCountdown(null)
          await performRandomVerification()
          scheduleNextRandomVerificationImpl()
        }
      }, 1000)
    }, delay)
  }, [cameraActive, performRandomVerification, totalFailures, awaitingReview, externalFailures])

  // Periodic verification (RANDOM)
  useEffect(() => {
    const combinedFailures = Math.max(totalFailures, externalFailures)
    if (!cameraActive || (combinedFailures >= MAX_FAILURES && verificationWaiting) || awaitingReview) {
      return
    }

    scheduleNextRandomVerification()

    return () => {
      if (randomTimeoutRef.current) {
        clearTimeout(randomTimeoutRef.current)
      }
      if (cameraPromptTimeoutRef.current) {
        clearTimeout(cameraPromptTimeoutRef.current)
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
      setRandomCountdown(null)
    }
  }, [cameraActive, totalFailures, awaitingReview, scheduleNextRandomVerification])

  // Manual verification
  const handleManualVerify = async () => {
    if (awaitingReview) return
    await performRandomVerification()
  }

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'verifying':
        return '⏳'
      case 'countdown':
        return '⏱️'
      case 'success':
        return '✓'
      case 'failed':
        return '✗'
      default:
        return '●'
    }
  }

  return (
    <div className="exam-proctor">
      {/* Main exam area */}
      <div className="exam-main">
        <div className="exam-header">
          <h1>Kỳ Thi Trực Tuyến</h1>
          <div className="exam-timer">{formatTime(examTime)}</div>
        </div>

        <div className="exam-content">
          {questions && questions.length > 0 ? (
            <div className="questions-list">
              {questions.map((q, idx) => (
                <div key={idx} className="question-item">
                  <p className="question-text">{q.text}</p>
                  {q.options && (
                    <div className="options">
                      {q.options.map((opt, i) => (
                        <label key={i} className="option">
                          <input type="radio" name={`q${idx}`} />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="placeholder">Chưa có câu hỏi</div>
          )}
        </div>

        <div className="exam-actions">
          <button className="btn-submit" onClick={() => onSessionEnd?.('SUBMITTED')} disabled={awaitingReview}>
            Nộp bài
          </button>
        </div>

        {awaitingReview && (
          <div className="review-overlay" role="dialog" aria-modal="true" aria-live="polite">
            <div className="review-overlay__card">
              <div className="review-overlay__icon">⏳</div>
              <h3>Đang chờ giám thị duyệt</h3>
              <p>
                Hệ thống đã chuyển phiên thi sang trạng thái chờ xử lý. Bạn tạm thời không thể tiếp tục xác minh hay nộp bài cho đến khi giám thị phê duyệt.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar - Proctor status */}
      <div className="proctor-sidebar">
        <h3 className="sidebar-title">Giám Sát</h3>

        {/* Camera preview */}
        <div className="camera-section">
          <button
            className="btn-toggle-camera"
            onClick={() => setShowCamera(!showCamera)}
            disabled={awaitingReview}
          >
            {showCamera ? '🔽 Ẩn Camera' : '📷 Xem Camera'}
          </button>

          {showCamera && (
            <div className="camera-preview-wrapper">
              <div className={`camera-preview ${!cameraActive ? 'inactive' : ''}`}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="proctor-video"
                />
                {!cameraActive && (
                  <div className="camera-unavailable">Camera không khả dụng</div>
                )}
              </div>
              <button
                className="btn-manual-verify"
                onClick={handleManualVerify}
                disabled={verificationStatus === 'verifying' || !cameraActive || awaitingReview}
              >
                {awaitingReview ? 'Đang chờ duyệt' : 'Xác Minh Ngay'}
              </button>
            </div>
          )}
        </div>

        {/* Verification status */}
        <div className={`status-section status-${displayedStatus}`}>
          <div className="status-icon">{getStatusIcon()}</div>
          <div className="status-text">
            {displayedStatus === 'idle' && 'Sẵn sàng'}
            {displayedStatus === 'countdown' && `Chuẩn bị chụp sau ${randomCountdown ?? 0}s...`}
            {displayedStatus === 'verifying' && 'Đang xác minh...'}
            {displayedStatus === 'success' && 'Xác minh thành công'}
            {displayedStatus === 'failed' && 'Xác minh thất bại'}
            {displayedStatus === 'needs_review' && 'Chờ giám thị duyệt'}
          </div>
        </div>

        {verificationStatus === 'countdown' && randomCountdown !== null && (
          <div className="alert-block">
            <span className="alert-icon">📸</span>
            <p>Random check sẽ chụp ảnh trong {randomCountdown} giây. Giữ khuôn mặt trong khung hình.</p>
          </div>
        )}

        {lastVerification && (
          <div className="confidence-display">
            <span className="label">Độ tin cậy:</span>
            <span className="value">{(lastVerification.confidence * 100).toFixed(1)}%</span>
          </div>
        )}

        {/* Failure counter (redesigned) */}
        <div className={`failure-card ${combinedFailures > 0 ? 'warning' : ''}`}>
          <div className="failure-header">
            <div className="failure-title">Kiểm tra ngẫu nhiên</div>
            <button
              className="info-btn"
              title="Số lần thất bại do các kiểm tra ngẫu nhiên của hệ thống."
            >
              i
            </button>
          </div>

          <div className="failure-rows">
            <div className="failure-row">
              <span className="label">Ngẫu nhiên</span>
              <span className="value">{totalFailures}/{MAX_FAILURES}</span>
            </div>

            <div className="failure-progress">
              <div className="progress-bar" aria-hidden>
                <div
                  className="progress-fill"
                  style={{ width: `${(totalFailures / MAX_FAILURES) * 100}%` }}
                />
              </div>
              <div className="progress-label">{totalFailures}/{MAX_FAILURES}</div>
            </div>
          </div>
        </div>

        {(combinedFailures >= MAX_FAILURES || awaitingReview) && (
          <div className="alert-block">
            <span className="alert-icon">⚠️</span>
            <p>
              {awaitingReview
                ? 'Phiên thi đang chờ giám thị duyệt. Vui lòng đợi.'
                : 'Vượt quá số lần xác minh thất bại. Phiên thi sẽ kết thúc.'}
            </p>
          </div>
        )}

        {/* Verification log */}
        <div className="verification-log">
          <h4 className="log-title">Nhật Ký Xác Minh</h4>
          <div className="log-entries">
            {verificationLog.length === 0 ? (
              <p className="no-log">Chưa có xác minh</p>
            ) : (
              verificationLog.slice(-5).map((log, idx) => (
                <div key={idx} className={`log-entry ${log.passed ? 'pass' : 'fail'}`}>
                  <span className="log-time">{log.timestamp}</span>
                  <span className="log-status">{log.passed ? '✓' : '✗'}</span>
                  <span className="log-confidence">
                    {(log.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
