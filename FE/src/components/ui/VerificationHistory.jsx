import React from 'react'
import './VerificationHistory.css'

export default function VerificationHistory({ history = [], loading = false }) {
  const TYPE_LABELS = {
    INITIAL: 'Xác minh đầu vào',
    RANDOM: 'Xác minh ngẫu nhiên',
    VERIFY_FAIL: 'Xác minh thất bại',
    VERIFY_SUCCESS: 'Xác minh thành công',
    DEVICE_CHANGED: 'Đổi thiết bị',
    MANUAL_REVIEW_REQUIRED: 'Cần duyệt thủ công',
    MULTIPLE_VERIFY_FAILED: 'Nhiều lần thất bại',
    SUSPICIOUS_ACTIVITY: 'Hành vi đáng ngờ',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Đã từ chối',
    FLAGGED: 'Đã gắn cờ',
    UNFLAGGED: 'Đã bỏ cờ',
    DEVICE_APPROVED: 'Đổi thiết bị đã duyệt',
  }

  const STATUS_LABELS = {
    VERIFIED: 'Đã xác minh',
    FAILED: 'Thất bại',
    PASS: 'Thành công',
    FAIL: 'Thất bại',
    SUCCESS: 'Thành công',
    REJECTED: 'Bị từ chối',
    APPROVED: 'Đã duyệt',
    FLAGGED: 'Đã gắn cờ',
    UNFLAGGED: 'Đã bỏ cờ',
    PENDING: 'Chờ xử lý',
    PENDING_REVIEW: 'Chờ duyệt',
  }

  const formatLabel = (value, mapping) => mapping[String(value || '').toUpperCase()] || value || 'UNKNOWN'

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleString('vi-VN')
    } catch {
      return dateString
    }
  }

  const formatConfidence = (value) => {
    if (value === null || value === undefined || value === '') return '-'
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return value
    return `${(numeric * 100).toFixed(1)}%`
  }

  const getStatusText = (entry) => {
    const rawStatus = entry?.status ?? entry?.result ?? entry?.verificationStatus
    if (!rawStatus && typeof entry?.verified === 'boolean') {
      return entry.verified ? 'VERIFIED' : 'FAILED'
    }
    return String(rawStatus || '').toUpperCase()
  }

  const getStatusBadge = (entry) => {
    const status = getStatusText(entry)
    const isSuccess = status === 'VERIFIED' || status === 'PASS' || status === 'SUCCESS' || status === 'APPROVED'
    const isPending = status === 'PENDING' || status === 'PENDING_REVIEW'

    if (isPending) {
      return <span className="verify-badge verify-pending">… {formatLabel(status, STATUS_LABELS)}</span>
    }

    if (isSuccess) {
      return <span className="verify-badge verify-success">✓ {formatLabel(status, STATUS_LABELS)}</span>
    }

    return <span className="verify-badge verify-failed">✕ {formatLabel(status, STATUS_LABELS)}</span>
  }

  if (loading) {
    return <div className="verification-history-loading">Đang tải lịch sử xác minh...</div>
  }

  if (!history || history.length === 0) {
    return <div className="verification-history-empty">Chưa có dữ liệu lịch sử cho phiên này.</div>
  }

  return (
    <div className="verification-history-container">
      {history.map((entry, index) => (
        <div key={entry.id || index} className="verification-card">
          {/* Header */}
          <div className="verification-card-header">
            <div className="header-left">
              <span className="attempt-badge">Lần {entry.attemptNo || index + 1}</span>
              <span className={`type-badge type-${(entry.type || 'UNKNOWN').toLowerCase()}`}>
                {formatLabel(entry.type, TYPE_LABELS)}
              </span>
            </div>
            <div className="header-right">{getStatusBadge(entry)}</div>
          </div>

          <div className="verification-card-subheader">
            <span>
              <strong>Thời gian:</strong> {formatDate(entry.verifiedAt || entry.createdAt)}
            </span>
            <span>
              <strong>Độ tin cậy:</strong> {formatConfidence(entry.confidence)}
            </span>
          </div>

          {/* Main Content */}
          <div className="verification-card-content">
            {/* Images Section */}
            <div className="images-section">
              {entry.cccdImageUrl && (
                <div className="image-group">
                  <label>Ảnh CCCD</label>
                  <a className="verification-image-link" href={entry.cccdImageUrl} target="_blank" rel="noopener noreferrer">
                    <div
                      className="verification-image-canvas"
                      role="img"
                      aria-label="CCCD"
                      style={{ backgroundImage: `url(${entry.cccdImageUrl})` }}
                    />
                  </a>
                </div>
              )}
              {entry.captureImageUrl && (
                <div className="image-group">
                  <label>Ảnh Xác Minh</label>
                  <a className="verification-image-link" href={entry.captureImageUrl} target="_blank" rel="noopener noreferrer">
                    <div
                      className="verification-image-canvas"
                      role="img"
                      aria-label="Capture"
                      style={{ backgroundImage: `url(${entry.captureImageUrl})` }}
                    />
                  </a>
                </div>
              )}
            </div>

            {/* Metrics Grid */}
            <div className="metrics-grid">
              <div className="metric">
                <span className="metric-label">Độ tin cậy:</span>
                <span className="metric-value">
                  {formatConfidence(entry.confidence)}
                </span>
                {entry.confidence !== null && entry.confidence !== undefined && entry.confidence !== '' && (
                  <div className="confidence-bar">
                    <div className="confidence-fill" style={{ width: `${entry.confidence * 100}%` }} />
                  </div>
                )}
              </div>
              <div className="metric">
                <span className="metric-label">Ngày giờ xác minh:</span>
                <span className="metric-value">{formatDate(entry.verifiedAt || entry.createdAt)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Ngày giờ tạo:</span>
                <span className="metric-value">{formatDate(entry.createdAt)}</span>
              </div>
              {entry.deviceId && (
                <div className="metric">
                  <span className="metric-label">Thiết bị:</span>
                  <span className="metric-value metric-value--wrap">{entry.deviceId}</span>
                </div>
              )}
            </div>

            {/* Device Info */}
            <div className="device-info-section">
              <h5>Thông tin thiết bị</h5>
              <div className="device-grid">
                {entry.deviceId && (
                  <div className="device-item">
                    <label>Device ID:</label>
                    <code>{entry.deviceId}</code>
                  </div>
                )}
                {entry.ipAddress && (
                  <div className="device-item">
                    <label>IP Address:</label>
                    <code>{entry.ipAddress}</code>
                  </div>
                )}
              </div>
              {entry.userAgent && (
                <div className="user-agent">
                  <label>User Agent:</label>
                  <code className="user-agent-code">{entry.userAgent}</code>
                </div>
              )}
            </div>

            {/* Failure Reason */}
            {entry.failReason && (
              <div className="failure-section">
                <h5>Lý do thất bại:</h5>
                <p className="failure-reason">{entry.failReason}</p>
              </div>
            )}

            {!entry.cccdImageUrl && !entry.captureImageUrl && (
              <div className="verification-note">
                Không có ảnh đính kèm cho lần xác minh này.
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
