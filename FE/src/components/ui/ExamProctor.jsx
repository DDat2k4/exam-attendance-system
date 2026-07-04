import { useCallback, useEffect, useRef, useState } from 'react'
import { requestCameraAccess, captureFrame, getDeviceInfo } from '../../utils/faceCapture'
import { verifyIdentity } from '../../api/verificationApi'
import './ExamProctor.css'

export default function ExamProctor({ examSessionId, onSessionEnd, questions = [], verificationWaiting = false, deviceApprovalWaiting = false, verificationClearedAt = null, externalFailures = 0 }) {
  const videoRef = useRef(null)
  const randomTimeoutRef = useRef(null)
  const cameraPromptTimeoutRef = useRef(null)
  const countdownIntervalRef = useRef(null)
  const prevVerificationWaitingRef = useRef(verificationWaiting)
  const [cameraActive, setCameraActive] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState('idle') // idle, verifying, success, failed
  const [lastVerification, setLastVerification] = useState(null)
  const [totalFailures, setTotalFailures] = useState(0)
  const [maxFailures, setMaxFailures] = useState(3)
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
  const DEFAULT_MAX_FAILURES = 3
  const EXAM_DURATION = 3600 // 1 hour in seconds
  const approvalBlocked = verificationWaiting || deviceApprovalWaiting || awaitingReview || verificationStatus === 'needs_review'
  const failureLimit = Number.isInteger(maxFailures) && maxFailures > 0 ? maxFailures : MAX_FAILURES

  useEffect(() => {
    showCameraRef.current = showCamera
  }, [showCamera])

  const registerFailure = useCallback(
    (nextStatus = 'failed') => {
      setVerificationStatus(nextStatus)
      setTotalFailures((prev) => {
        const newFailures = prev + 1
        if (newFailures >= failureLimit) {
          setVerificationStatus('needs_review')
          setAwaitingReview(true)
        } else {
          setTimeout(() => setVerificationStatus('idle'), 2500)
        }

        return newFailures
      })
    },
    [failureLimit],
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

  useEffect(() => {
    if (deviceApprovalWaiting) {
      setAwaitingReview(true)
      setVerificationStatus('needs_review')
    }
  }, [deviceApprovalWaiting])

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
    // If we recently cleared (proctor approved), ignore external updates for a short window
    if (Date.now() < ignoreExternalUntil) {
      return
    }

    setTotalFailures((prev) => {
      if (externalFailures === 0) return 0
      if (externalFailures > prev) return externalFailures
      return prev
    })

    if (externalFailures >= failureLimit) {
      setVerificationStatus('needs_review')
      if (verificationWaiting) {
        setAwaitingReview(true)
      }
    }
  }, [externalFailures, verificationWaiting, ignoreExternalUntil, failureLimit])

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
    if (!videoRef.current || !cameraActive || approvalBlocked || (combinedFailures >= failureLimit && verificationWaiting)) {
    
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

      if (Number.isInteger(response?.attempt)) {
        setTotalFailures(response.attempt)
      }
      if (Number.isInteger(response?.maxAttempt) && response.maxAttempt > 0) {
        setMaxFailures(response.maxAttempt)
      }

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
        setAwaitingReview(true)
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
        const backendFailures = Number.isInteger(response?.attempt) ? response.attempt : totalFailures + 1
        setTotalFailures(backendFailures)
        if (Number.isInteger(response?.maxAttempt) && response.maxAttempt > 0) {
          setMaxFailures(response.maxAttempt)
        }

        if ((Number.isInteger(response?.remainingAttempt) && response.remainingAttempt <= 0) || backendFailures >= failureLimit) {
          setVerificationStatus('needs_review')
          setAwaitingReview(true)
        } else {
          setVerificationStatus('failed')
          setTimeout(() => setVerificationStatus('idle'), 2500)
        }
      }
    } catch (err) {
        console.error('Verification error:', err)
        // Log error with backend message when available
        const logEntry = {
          timestamp: new Date().toLocaleTimeString(),
          type: 'RANDOM',
          passed: false,
          confidence: null,
          attempt: null,
          sessionStatus: null,
          reconnect: null,
          message: err?.message || String(err),
        }
        setVerificationLog((prev) => [...prev, logEntry])
        setLastVerification(logEntry)
        // Surface backend message if present
        setVerificationStatus('failed')
        setAwaitingReview(false)
        setTimeout(() => setVerificationStatus('idle'), 2500)
    }
  }, [cameraActive, examSessionId, registerFailure, totalFailures, externalFailures, awaitingReview, verificationWaiting, approvalBlocked, failureLimit])

  const scheduleNextRandomVerification = useCallback(function scheduleNextRandomVerificationImpl() {
    const combinedFailures = Math.max(totalFailures, externalFailures)
    if ((combinedFailures >= failureLimit && verificationWaiting) || !cameraActive || approvalBlocked) return

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
  }, [cameraActive, performRandomVerification, totalFailures, approvalBlocked, awaitingReview, externalFailures, failureLimit])

  // Periodic verification (RANDOM)
  useEffect(() => {
    const combinedFailures = Math.max(totalFailures, externalFailures)
    if (!cameraActive || (combinedFailures >= failureLimit && verificationWaiting) || approvalBlocked) {
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
  }, [cameraActive, totalFailures, approvalBlocked, awaitingReview, scheduleNextRandomVerification, failureLimit, externalFailures, verificationWaiting])

  // Manual verification
  const handleManualVerify = async () => {
    if (approvalBlocked) return
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
          <button className="btn-submit" onClick={() => onSessionEnd?.('SUBMITTED')} disabled={approvalBlocked}>
            Nộp bài
          </button>
        </div>

        {approvalBlocked && (
          <div className="review-overlay" role="dialog" aria-modal="true" aria-live="polite">
            <div className="review-overlay__card">
              <div className="review-overlay__icon">⏳</div>
              <h3>{deviceApprovalWaiting ? 'Đang chờ duyệt thiết bị' : 'Đang chờ giám thị duyệt'}</h3>
              <p>
                {deviceApprovalWaiting
                  ? 'Hệ thống đã khóa phiên thi do thay đổi thiết bị. Bạn không thể làm bài hay nộp bài cho đến khi giám thị phê duyệt.'
                  : 'Hệ thống đã chuyển phiên thi sang trạng thái chờ xử lý. Bạn tạm thời không thể tiếp tục xác minh hay nộp bài cho đến khi giám thị phê duyệt.'}
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
            disabled={approvalBlocked}
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
                disabled={verificationStatus === 'verifying' || !cameraActive || approvalBlocked}
              >
                {approvalBlocked ? 'Đang chờ duyệt' : 'Xác Minh Ngay'}
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
              <span className="value">{totalFailures}/{failureLimit}</span>
            </div>

            <div className="failure-progress">
              <div className="progress-bar" aria-hidden>
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min((totalFailures / failureLimit) * 100, 100)}%` }}
                />
              </div>
              <div className="progress-label">{totalFailures}/{failureLimit}</div>
            </div>
          </div>
        </div>

        {(combinedFailures >= failureLimit || awaitingReview) && (
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
