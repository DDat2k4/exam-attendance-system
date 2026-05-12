import { useEffect, useState } from 'react'
import VerificationHistory from '../ui/VerificationHistory'
import { useExcelExport } from '../../hooks/useExcelExport'
import {
  CheckIcon,
  CloseIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FlagIcon,
  LayoutGridIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  TrashIcon,
} from '../ui/AppIcons'

const PROCTOR_STATUS_LABELS = {
  INIT: 'Khởi tạo',
  CHECKED_IN: 'Đã check-in',
  IN_PROGRESS: 'Đang thi',
  DONE: 'Đã hoàn thành',
  BLOCKED: 'Bị khóa',
  PENDING_REVIEW: 'Chờ giám thị duyệt',
  PENDING_DEVICE_APPROVAL: 'Chờ duyệt thiết bị',
}

const ALERT_TYPE_LABELS = {
  VERIFY_FAIL: 'Xác minh thất bại',
  VERIFY_SUCCESS: 'Xác minh thành công',
  SESSION_BLOCKED: 'Khóa phiên thi',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị từ chối',
  FLAGGED: 'Đã gắn cờ',
  UNFLAGGED: 'Đã bỏ cờ',
  DEVICE_CHANGED: 'Đổi thiết bị',
  MULTIPLE_VERIFY_FAILED: 'Nhiều lần thất bại',
  MANUAL_REVIEW_REQUIRED: 'Cần duyệt thủ công',
  SUSPICIOUS_ACTIVITY: 'Hành vi đáng ngờ',
}

const formatLabel = (value, mapping) => mapping[String(value || '').toUpperCase()] || value || 'UNKNOWN'

export default function ProctorSection({
  openProctorRoomModal,
  loadingProctorDashboard,
  proctorActionLoading,
  refreshProctorDashboard,
  proctorFilter,
  setProctorFilter,
  proctorRoomFilterOptions,
  proctorStatusOptions,
  fetchProctorDashboard,
  setSelectedProctorSession,
  setProctorHistory,
  setProctorReason,
  proctorDashboard,
  getSessionRecordId,
  selectedProctorSessionId,
  fetchProctorHistory,
  proctorPagination,
  showProctorDetailModal,
  setShowProctorDetailModal,
  selectedProctorSession,
  formatDateTime,
  loadingProctorHistory,
  proctorHistory,
  runProctorAction,
  proctorReason,
  proctorAlerts,
  clearProctorAlerts,
  proctorSocketStatus,
}) {
  const { loading: exporting, error: exportError, exportReport } = useExcelExport()
  const [showExportError, setShowExportError] = useState(false)
  const [exportErrorMessage, setExportErrorMessage] = useState('')
  const [captureImageBroken, setCaptureImageBroken] = useState(false)

  useEffect(() => {
    setCaptureImageBroken(false)
  }, [selectedProctorSessionId])

  const handleExportReport = async () => {
    console.log('handleExportReport clicked, proctorFilter.roomId:', proctorFilter.roomId)
    
    if (!proctorFilter.roomId) {
      console.warn('roomId không có, không thể xuất báo cáo')
      setExportErrorMessage('Vui lòng chọn phòng thi trước khi xuất báo cáo.')
      setShowExportError(true)
      return
    }
    
    try {
      console.log('Gọi exportReport với roomId:', proctorFilter.roomId)
      await exportReport(proctorFilter.roomId)
      setExportErrorMessage('')
      setShowExportError(false)
    } catch (err) {
      console.error('Export error:', err)
      setExportErrorMessage(err.message || 'Không thể xuất báo cáo')
      setShowExportError(true)
    }
  }

  const socketStatusLabel = {
    CONNECTED: 'Realtime: Đã kết nối',
    CONNECTING: 'Realtime: Đang kết nối...',
    ERROR: 'Realtime: Lỗi kết nối',
    IDLE: 'Realtime: Chưa bật',
  }[proctorSocketStatus] || 'Realtime: Chưa bật'

  return (
    <section className="panel proctor-panel">
      <div className="session-head">
        <div>
          <h2>Giám sát proctor</h2>
          <p className="student-exam-note">Xem nhanh dashboard, duyệt hoặc gắn cờ phiên thi, và tra lịch sử xác minh.</p>
        </div>
        <div className="inline-actions">
          <button
            type="button"
            className="tiny-btn icon-only-btn proctor-hero-icon-btn"
            onClick={openProctorRoomModal}
            disabled={loadingProctorDashboard || proctorActionLoading || exporting}
            aria-label="Chọn hoặc đổi phòng"
            title="Chọn/Đổi phòng"
          >
            <LayoutGridIcon />
          </button>
          <button
            type="button"
            className="tiny-btn icon-only-btn proctor-hero-icon-btn"
            onClick={refreshProctorDashboard}
            disabled={loadingProctorDashboard || proctorActionLoading || !proctorFilter.roomId || exporting}
            aria-label="Tải lại dashboard"
            title="Tải lại dashboard"
          >
            <RefreshIcon />
          </button>
          <button
            type="button"
            className="tiny-btn success icon-only-btn proctor-hero-icon-btn"
            onClick={handleExportReport}
            disabled={exporting || proctorActionLoading || !proctorFilter.roomId}
            title="Xuất báo cáo phòng thi ra file Excel"
            aria-label="Xuất báo cáo"
          >
            <DownloadIcon />
          </button>
          {showExportError && (exportErrorMessage || exportError) && (
            <span className="proctor-inline-error">
              {exportErrorMessage || exportError}
              <button
                type="button"
                className="proctor-inline-error__close"
                onClick={() => {
                  setShowExportError(false)
                  setExportErrorMessage('')
                }}
                aria-label="Đóng lỗi xuất báo cáo"
              >
                <CloseIcon />
              </button>
            </span>
          )}
        </div>
      </div>

      <form className="grid-form proctor-filter-form" onSubmit={(e) => { e.preventDefault(); fetchProctorDashboard(null, 0) }}>
        <div className="proctor-filter-item">
          <label htmlFor="proctorRoomId">Room</label>
          <select
            id="proctorRoomId"
            value={proctorFilter.roomId}
            onChange={(e) => setProctorFilter((prev) => ({ ...prev, roomId: e.target.value }))}
          >
            <option value="">Chọn phòng theo tên</option>
            {proctorRoomFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="proctor-filter-item">
          <label htmlFor="proctorStatus">Status</label>
          <select
            id="proctorStatus"
            value={proctorFilter.status}
            onChange={(e) => setProctorFilter((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="">Tất cả trạng thái</option>
            {proctorStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="proctor-filter-item">
          <label htmlFor="proctorFlagged">Flagged</label>
          <select
            id="proctorFlagged"
            value={proctorFilter.flagged}
            onChange={(e) => setProctorFilter((prev) => ({ ...prev, flagged: e.target.value }))}
          >
            <option value="">Tất cả</option>
            <option value="true">Có</option>
            <option value="false">Không</option>
          </select>
        </div>

        <div className="proctor-filter-item proctor-filter-keyword">
          <label htmlFor="proctorKeyword">Keyword</label>
          <input
            id="proctorKeyword"
            value={proctorFilter.keyword}
            onChange={(e) => setProctorFilter((prev) => ({ ...prev, keyword: e.target.value }))}
            placeholder="Tìm theo tên(In hoa không dấu), CCCD(9 số cuối)"
          />
        </div>

        <div className="proctor-filter-item proctor-filter-size">
          <label htmlFor="proctorSize">Size</label>
          <select
            id="proctorSize"
            value={proctorFilter.size}
            onChange={(e) => setProctorFilter((prev) => ({ ...prev, size: Number(e.target.value) }))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="proctor-filter-actions">
          <button
            className="primary icon-only-btn"
            type="submit"
            disabled={loadingProctorDashboard || !proctorFilter.roomId}
            aria-label="Áp dụng bộ lọc"
            title="Áp dụng bộ lọc"
          >
            <SearchIcon />
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => {
              setProctorFilter({ roomId: '', status: '', flagged: '', keyword: '', page: 0, size: 20 })
              setSelectedProctorSession(null)
              setProctorHistory([])
              setProctorReason('')
            }}
            disabled={loadingProctorDashboard}
            aria-label="Xóa lọc"
            title="Xóa lọc"
          >
            <CloseIcon />
          </button>
        </div>
      </form>

      <div className="proctor-alert-feed">
        <div className="session-head">
          <div>
            <h3>Cảnh báo realtime</h3>
            <p className="student-exam-note">{socketStatusLabel} • Room hiện tại: {proctorFilter.roomId || '-'}</p>
          </div>
          <div className="inline-actions">
            <button
              type="button"
              className="tiny-btn icon-only-btn"
              onClick={clearProctorAlerts}
              disabled={proctorAlerts.length === 0}
              aria-label="Xóa feed cảnh báo"
              title="Xóa feed"
            >
              <TrashIcon />
            </button>
          </div>
        </div>

        {proctorAlerts.length === 0 ? (
          <p>Chưa có cảnh báo mới cho phòng đang giám sát.</p>
        ) : (
          <div className="proctor-alert-list">
            {proctorAlerts.map((alert, index) => (
              <article key={`${alert.sessionId || 'session'}-${alert.timestamp}-${index}`} className="proctor-alert-item">
                <div className="proctor-alert-item-head">
                  <span className="risk-badge risk-info">
                    {formatLabel(alert.type, ALERT_TYPE_LABELS)}
                  </span>
                  <span className={`risk-badge risk-${String(alert.severity || 'LOW').toLowerCase()}`}>
                    {alert.severity || 'LOW'}
                  </span>
                  <small>{formatDateTime(alert.timestamp)}</small>
                </div>
                <strong>{alert.message}</strong>
                <small>
                  Session #{alert.sessionId || '-'} • User #{alert.userId || '-'} • Room #{alert.roomId || '-'}
                </small>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="proctor-list">
        <div className="session-head">
          <h3>Dashboard</h3>
          <span className="student-exam-note">{proctorDashboard.length} phiên</span>
        </div>

        {loadingProctorDashboard ? (
          <p>Đang tải dashboard proctor...</p>
        ) : proctorDashboard.length === 0 ? (
          <p>Chưa có phiên nào phù hợp với bộ lọc hiện tại.</p>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>CCCD</th>
                    <th>Room</th>
                    <th>Attendance</th>
                    <th>Exam Status</th>
                    <th>Risk</th>
                    <th>Attempt</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {proctorDashboard.map((item, idx) => {
                    const sessionId = getSessionRecordId(item) ?? idx
                    const isSelected = String(sessionId) === String(selectedProctorSessionId)

                    return (
                      <tr key={`${sessionId}-${idx}`} className={isSelected ? 'selected-row' : ''} onClick={() => fetchProctorHistory(item)}>
                        <td>{item?.studentName ?? '-'}</td>
                        <td>{item?.citizenId ?? '-'}</td>
                        <td>{item?.roomCode ?? item?.roomId ?? item?.room?.id ?? '-'}</td>
                        <td>
                          <span className={`status-badge badge-${(item?.attendanceStatus || 'UNKNOWN').toLowerCase()}`}>
                            {formatLabel(item?.attendanceStatus, PROCTOR_STATUS_LABELS)}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge badge-${(item?.examSessionStatus || 'UNKNOWN').toLowerCase()}`}>
                            {formatLabel(item?.examSessionStatus, PROCTOR_STATUS_LABELS)}
                          </span>
                        </td>
                        <td>
                          <span className={`risk-badge risk-${(item?.riskLevel || 'LOW').toLowerCase()}`}>
                            {item?.riskLevel || 'LOW'}
                          </span>
                        </td>
                        <td className="attempt-cell">{item?.attemptNo ?? '-'}</td>
                        <td>
                          <div className="table-actions">
                            <button
                              type="button"
                              className="tiny-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                fetchProctorHistory(item)
                              }}
                            >
                              Chi tiết
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="registration-pagination" style={{ marginTop: '12px' }}>
              <span>
                Trang {proctorPagination.currentPage + 1} / {proctorPagination.totalPages || 1} • Tổng {proctorPagination.totalElements} phiên
              </span>
              <div className="inline-actions">
                <button
                  type="button"
                  className="tiny-btn icon-only-btn"
                  onClick={() => fetchProctorDashboard(null, Math.max(0, proctorPagination.currentPage - 1))}
                  disabled={loadingProctorDashboard || proctorPagination.currentPage === 0}
                  aria-label="Trang trước"
                  title="Trang trước"
                >
                  <ChevronLeftIcon />
                </button>
                <button
                  type="button"
                  className="tiny-btn icon-only-btn"
                  onClick={() => fetchProctorDashboard(null, proctorPagination.currentPage + 1)}
                  disabled={loadingProctorDashboard || proctorPagination.currentPage >= proctorPagination.totalPages - 1}
                  aria-label="Trang sau"
                  title="Trang sau"
                >
                  <ChevronRightIcon />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showProctorDetailModal && (
        <div className="proctor-modal-overlay" onClick={() => {
          setShowProctorDetailModal(false)
          setSelectedProctorSession(null)
          setProctorHistory([])
          setProctorReason('')
        }}>
          <div className="proctor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="proctor-modal-header">
              <h3>Chi tiết phiên xác minh</h3>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => {
                    setShowProctorDetailModal(false)
                    setSelectedProctorSession(null)
                    setProctorHistory([])
                    setProctorReason('')
                  }}
                  aria-label="Đóng chi tiết"
                >
                  <CloseIcon />
                </button>
            </div>

            <div className="proctor-modal-content">
              {!selectedProctorSession ? (
                <p>Chọn một phiên trong dashboard để xem chi tiết.</p>
              ) : (
                <>
                  <div className="proctor-student-header">
                    <div>
                      <h4>{selectedProctorSession?.studentName ?? 'Student'}</h4>
                      <div className="proctor-student-tags">
                        <span className={`status-badge badge-${(selectedProctorSession?.attendanceStatus || 'pending').toLowerCase()}`}>
                          {formatLabel(selectedProctorSession?.attendanceStatus, PROCTOR_STATUS_LABELS)}
                        </span>
                        <span className={`status-badge badge-${(selectedProctorSession?.examSessionStatus || 'unknown').toLowerCase()}`}>
                          {formatLabel(selectedProctorSession?.examSessionStatus, PROCTOR_STATUS_LABELS)}
                        </span>
                        {selectedProctorSession?.flagged && (
                          <span className="flagged-indicator-badge">🚩 Flagged</span>
                        )}
                      </div>
                    </div>
                    <div className={`risk-indicator risk-${(selectedProctorSession?.riskLevel || 'LOW').toLowerCase()}`}>
                      {selectedProctorSession?.riskLevel || 'LOW'}
                    </div>
                  </div>

                  <div className="proctor-summary-grid">
                    <div><span>CCCD</span><strong>{selectedProctorSession?.citizenId ?? '-'}</strong></div>
                    <div><span>Room Code</span><strong>{selectedProctorSession?.roomCode ?? selectedProctorSession?.roomId ?? '-'}</strong></div>
                    <div><span>Device</span><strong className="device-id">{selectedProctorSession?.deviceId ?? '-'}</strong></div>

                    <div><span>Attendance Status</span><strong className={`status-text badge-${(selectedProctorSession?.attendanceStatus || 'unknown').toLowerCase()}`}>{formatLabel(selectedProctorSession?.attendanceStatus, PROCTOR_STATUS_LABELS)}</strong></div>
                    <div><span>Exam Status</span><strong>{formatLabel(selectedProctorSession?.examSessionStatus, PROCTOR_STATUS_LABELS)}</strong></div>

                    <div><span>Attempt</span><strong>{selectedProctorSession?.attemptNo ?? '-'}</strong></div>
                    <div><span>Last Verify ID</span><strong>{selectedProctorSession?.lastVerifyId ?? '-'}</strong></div>

                    <div><span>Last Verify Time</span><strong>{formatDateTime(selectedProctorSession?.lastVerifyTime)}</strong></div>
                    <div><span>Last Confidence</span><strong>{selectedProctorSession?.lastConfidence ? `${(selectedProctorSession.lastConfidence * 100).toFixed(1)}%` : '-'}</strong></div>

                    <div><span>Flagged</span><strong className={selectedProctorSession?.flagged ? 'flagged-yes' : 'flagged-no'}>
                      {selectedProctorSession?.flagged ? '🚩 YES' : '✓ NO'}
                    </strong></div>

                    {selectedProctorSession?.captureImageUrl && (
                      <div className="capture-image-preview">
                        <span>Ảnh xác minh</span>
                        <a href={selectedProctorSession?.captureImageUrl} target="_blank" rel="noopener noreferrer">
                          {!captureImageBroken ? (
                            <img
                              src={selectedProctorSession?.captureImageUrl}
                              alt="Capture"
                              loading="lazy"
                              onError={() => setCaptureImageBroken(true)}
                            />
                          ) : (
                            <div className="capture-image-fallback">
                              <strong>Không tải được ảnh xem trước</strong>
                              <span>Mở liên kết để xem ảnh gốc.</span>
                            </div>
                          )}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="proctor-history">
                    <div className="session-head">
                      <h4>Lịch sử xác minh</h4>
                      <button
                        type="button"
                        className="tiny-btn icon-only-btn"
                        onClick={() => fetchProctorHistory(selectedProctorSession)}
                        disabled={loadingProctorHistory}
                        aria-label="Tải lại lịch sử xác minh"
                        title="Tải lại lịch sử"
                      >
                        <RefreshIcon />
                      </button>
                    </div>

                    <VerificationHistory history={proctorHistory} loading={loadingProctorHistory} />
                  </div>
                </>
              )}
            </div>

            {selectedProctorSession && (
              <div className="proctor-modal-footer">
                <textarea
                  value={proctorReason}
                  onChange={(e) => setProctorReason(e.target.value)}
                  placeholder="Nhập lý do để flag hoặc reject phiên thi"
                  rows={3}
                />
                <div className="proctor-footer-actions">
                  <button
                    type="button"
                    className="tiny-btn icon-only-btn"
                    onClick={() => runProctorAction('approve')}
                    disabled={proctorActionLoading}
                    aria-label="Duyệt phiên"
                    title="Duyệt"
                  >
                    <CheckIcon />
                  </button>
                  {!selectedProctorSession?.flagged ? (
                    <button
                      type="button"
                      className="tiny-btn danger icon-only-btn"
                      onClick={() => runProctorAction('flag')}
                      disabled={proctorActionLoading}
                      aria-label="Gắn cờ phiên"
                      title="Gắn cờ"
                    >
                      <FlagIcon />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="tiny-btn warning icon-only-btn"
                      onClick={() => runProctorAction('unflag')}
                      disabled={proctorActionLoading}
                      aria-label="Bỏ cờ phiên"
                      title="Bỏ cờ"
                    >
                      <CloseIcon />
                    </button>
                  )}
                  <button
                    type="button"
                    className="tiny-btn danger icon-only-btn"
                    onClick={() => runProctorAction('reject')}
                    disabled={proctorActionLoading}
                    aria-label="Từ chối phiên"
                    title="Từ chối"
                  >
                    <CloseIcon />
                  </button>
                  <button
                    type="button"
                    className="tiny-btn secondary"
                    onClick={() => {
                      setShowProctorDetailModal(false)
                      setSelectedProctorSession(null)
                      setProctorHistory([])
                      setProctorReason('')
                      setShowExportError(false)
                    }}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
