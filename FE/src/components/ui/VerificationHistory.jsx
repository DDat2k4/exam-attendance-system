import React from 'react'
import './VerificationHistory.css'

export default function VerificationHistory({ history = [], loading = false }) {
  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleString('vi-VN')
    } catch {
      return dateString
    }
  }

  const getVerificationStatusBadge = (verified) => {
    if (verified) {
      return <span className="verify-badge verify-success">✓ Thành công</span>
    }
    return <span className="verify-badge verify-failed">✕ Thất bại</span>
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
                {entry.type || 'UNKNOWN'}
              </span>
            </div>
            <div className="header-right">{getVerificationStatusBadge(entry.verified, entry.failReason)}</div>
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
                  {entry.confidence ? `${(entry.confidence * 100).toFixed(1)}%` : '-'}
                </span>
                {entry.confidence && (
                  <div className="confidence-bar">
                    <div className="confidence-fill" style={{ width: `${entry.confidence * 100}%` }} />
                  </div>
                )}
              </div>
              <div className="metric">
                <span className="metric-label">Ngày giờ xác minh:</span>
                <span className="metric-value">{formatDate(entry.verifiedAt)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Ngày giờ tạo:</span>
                <span className="metric-value">{formatDate(entry.createdAt)}</span>
              </div>
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
          </div>
        </div>
      ))}
    </div>
  )
}
