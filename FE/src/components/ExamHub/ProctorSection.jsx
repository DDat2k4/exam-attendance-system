import { useState } from 'react'
import VerificationHistory from '../ui/VerificationHistory'
import { useExcelExport } from '../../hooks/useExcelExport'

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
}) {
  const { loading: exporting, error: exportError, exportReport } = useExcelExport()
  const [showExportError, setShowExportError] = useState(false)

  const handleExportReport = async () => {
    console.log('handleExportReport clicked, proctorFilter.roomId:', proctorFilter.roomId)
    
    if (!proctorFilter.roomId) {
      console.warn('roomId không có, không thể xuất báo cáo')
      setShowExportError(true)
      return
    }
    
    try {
      console.log('Gọi exportReport với roomId:', proctorFilter.roomId)
      await exportReport(proctorFilter.roomId)
      setShowExportError(false)
    } catch (err) {
      console.error('Export error:', err)
      setShowExportError(true)
    }
  }
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
            className="tiny-btn"
            onClick={openProctorRoomModal}
            disabled={loadingProctorDashboard || proctorActionLoading || exporting}
          >
            Chọn/Đổi phòng
          </button>
          <button
            type="button"
            className="tiny-btn"
            onClick={refreshProctorDashboard}
            disabled={loadingProctorDashboard || proctorActionLoading || !proctorFilter.roomId || exporting}
          >
            {loadingProctorDashboard ? 'Đang tải...' : 'Tải lại dashboard'}
          </button>
          <button
            type="button"
            className="tiny-btn success"
            onClick={handleExportReport}
            disabled={exporting || proctorActionLoading || !proctorFilter.roomId}
            title="Xuất báo cáo phòng thi ra file Excel"
          >
            {exporting ? ' Đang xuất...' : ' Xuất báo cáo'}
          </button>
          {showExportError && exportError && (
            <span style={{ color: '#d32f2f', fontSize: '12px', marginLeft: '8px' }}>
              {exportError}
            </span>
          )}
        </div>
      </div>

      <form className="grid-form proctor-filter-form" onSubmit={(e) => { e.preventDefault(); fetchProctorDashboard(null, 0) }}>
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

        <label htmlFor="proctorKeyword">Keyword</label>
        <input
          id="proctorKeyword"
          value={proctorFilter.keyword}
          onChange={(e) => setProctorFilter((prev) => ({ ...prev, keyword: e.target.value }))}
          placeholder="Tìm theo tên(In hoa không dấu), CCCD(9 số cuối)"
        />

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

        <button className="primary" type="submit" disabled={loadingProctorDashboard || !proctorFilter.roomId}>
          Áp dụng bộ lọc
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
        >
          Xóa lọc
        </button>
      </form>

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
                            {item?.attendanceStatus || 'UNKNOWN'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge badge-${(item?.examSessionStatus || 'UNKNOWN').toLowerCase()}`}>
                            {item?.examSessionStatus || 'UNKNOWN'}
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
                  className="tiny-btn"
                  onClick={() => fetchProctorDashboard(null, Math.max(0, proctorPagination.currentPage - 1))}
                  disabled={loadingProctorDashboard || proctorPagination.currentPage === 0}
                >
                  Trước
                </button>
                <button
                  type="button"
                  className="tiny-btn"
                  onClick={() => fetchProctorDashboard(null, proctorPagination.currentPage + 1)}
                  disabled={loadingProctorDashboard || proctorPagination.currentPage >= proctorPagination.totalPages - 1}
                >
                  Sau
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
              >
                ✕
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
                      <span className={`status-badge badge-${(selectedProctorSession?.attendanceStatus || 'pending').toLowerCase()}`}>
                        {selectedProctorSession?.attendanceStatus || 'PENDING'}
                      </span>
                      {selectedProctorSession?.flagged && (
                        <span className="flagged-indicator-badge">🚩 Flagged</span>
                      )}
                    </div>
                    <div className={`risk-indicator risk-${(selectedProctorSession?.riskLevel || 'LOW').toLowerCase()}`}>
                      {selectedProctorSession?.riskLevel || 'LOW'}
                    </div>
                  </div>

                  <div className="proctor-summary-grid">
                    <div><span>CCCD</span><strong>{selectedProctorSession?.citizenId ?? '-'}</strong></div>
                    <div><span>Room Code</span><strong>{selectedProctorSession?.roomCode ?? selectedProctorSession?.roomId ?? '-'}</strong></div>
                    <div><span>Device</span><strong className="device-id">{selectedProctorSession?.deviceId ?? '-'}</strong></div>

                    <div><span>Attendance Status</span><strong className={`status-text badge-${(selectedProctorSession?.attendanceStatus || 'unknown').toLowerCase()}`}>{selectedProctorSession?.attendanceStatus ?? '-'}</strong></div>
                    <div><span>Exam Status</span><strong>{selectedProctorSession?.examSessionStatus ?? '-'}</strong></div>

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
                          <img src={selectedProctorSession?.captureImageUrl} alt="Capture" loading="lazy" />
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="proctor-history">
                    <div className="session-head">
                      <h4>Lịch sử xác minh</h4>
                      <button
                        type="button"
                        className="tiny-btn"
                        onClick={() => fetchProctorHistory(selectedProctorSession)}
                        disabled={loadingProctorHistory}
                      >
                        {loadingProctorHistory ? 'Đang tải...' : 'Tải lại lịch sử'}
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
                    className="tiny-btn"
                    onClick={() => runProctorAction('approve')}
                    disabled={proctorActionLoading}
                  >
                    {proctorActionLoading ? 'Đang xử lý...' : '✓ Duyệt'}
                  </button>
                  <button
                    type="button"
                    className="tiny-btn danger"
                    onClick={() => runProctorAction('flag')}
                    disabled={proctorActionLoading}
                  >
                    {proctorActionLoading ? 'Đang xử lý...' : '🚩 Gắn cờ'}
                  </button>
                  <button
                    type="button"
                    className="tiny-btn danger"
                    onClick={() => runProctorAction('reject')}
                    disabled={proctorActionLoading}
                  >
                    {proctorActionLoading ? 'Đang xử lý...' : '✕ Từ chối'}
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
