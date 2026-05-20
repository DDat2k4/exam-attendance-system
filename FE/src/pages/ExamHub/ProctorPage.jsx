import { useEffect, useState } from 'react'
import { getAllExams } from '../../api/examApi'
import ProctorSection from '../../components/ExamHub/ProctorSection'
import useProctorSection, { PROCTOR_STATUS_OPTIONS, formatProctorToastMeta } from '../../hooks/useProctorSection'
import { useAuth } from '../../context/AuthContext'
import { canAccess } from '../../utils/rbac'
import '../../components/ExamHub/ExamHub.css'

const HUB_SECTIONS = {
  PROCTOR: 'proctor',
}

export default function ProctorPage() {
  const { user } = useAuth()
  const [exams, setExams] = useState([])
  const [examSearch, setExamSearch] = useState('')
  const [roomSearch, setRoomSearch] = useState('')
  const [showExamDropdown, setShowExamDropdown] = useState(false)
  const [showRoomDropdown, setShowRoomDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeSection, setActiveSection] = useState(HUB_SECTIONS.PROCTOR)

  const canControlSessions = canAccess(user, {
    allowRoles: ['ADMIN', 'PROCTOR'],
    allowPermissions: ['EXAM_MANAGE', 'EXAM_SESSION_START', 'EXAM_SESSION_END'],
    match: 'any',
  })

  async function fetchExams() {
    try {
      setLoading(true)
      setError('')
      const items = await getAllExams({ hydrateRooms: false })
      setExams(Array.isArray(items) ? items : [])
    } catch (err) {
      setError(err.message || 'Cannot load exams.')
    } finally {
      setLoading(false)
    }
  }

  const {
    proctorDashboard,
    loadingProctorDashboard,
    proctorFilter,
    setProctorFilter,
    proctorPagination,
    selectedProctorSession,
    setSelectedProctorSession,
    showProctorDetailModal,
    setShowProctorDetailModal,
    proctorHistory,
    setProctorHistory,
    loadingProctorHistory,
    proctorReason,
    setProctorReason,
    proctorActionLoading,
    showProctorRoomModal,
    proctorExamDraft,
    proctorRoomDraft,
    setProctorRoomDraft,
    proctorRoomOptions,
    loadingProctorRooms,
    proctorRoomFilterExamOptions,
    proctorRoomFilterExamId,
    handleProctorRoomFilterExamChange,
    proctorRoomFilterOptions,
    loadingProctorRoomFilterOptions,
    selectedProctorExamLabel,
    selectedProctorRoomLabel,
    proctorAlerts,
    clearProctorAlerts,
    proctorToasts,
    dismissProctorToast,
    proctorSocketStatus,
    getSessionRecordId,
    selectedProctorSessionId,
    fetchProctorDashboard,
    fetchProctorHistory,
    refreshProctorDashboard,
    openProctorRoomModal,
    closeProctorRoomModal,
    applyProctorRoomSelection,
    handleProctorExamDraftChange,
    runProctorAction,
  } = useProctorSection({
    activeSection,
    setActiveSection,
    hubSections: HUB_SECTIONS,
    exams,
    loading,
    fetchExams,
    setError,
    setSuccess,
  })

  const formatDateTime = (raw) => {
    if (!raw) return '-'
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return raw
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  useEffect(() => {
    if (canControlSessions) {
      fetchExams()
    }
  }, [canControlSessions])

  return (
    <div className="exam-page">
      <header className="exam-header">
        <div>
          <h1>Giám sát Proctor</h1>
          <p className="exam-subtitle">Xem dashboard, duyệt hoặc gắn cờ phiên thi, và tra lịch sử xác minh</p>
        </div>
        <button type="button" onClick={fetchExams} disabled={loading}>
          {loading ? 'Đang tải...' : 'Tải lại'}
        </button>
      </header>

      {error && <p className="feedback error">{error}</p>}
      {success && <p className="feedback success">{success}</p>}

      <ProctorSection
        openProctorRoomModal={openProctorRoomModal}
        loadingProctorDashboard={loadingProctorDashboard}
        proctorActionLoading={proctorActionLoading}
        refreshProctorDashboard={refreshProctorDashboard}
        proctorFilter={proctorFilter}
        setProctorFilter={setProctorFilter}
        proctorStatusOptions={PROCTOR_STATUS_OPTIONS}
        fetchProctorDashboard={fetchProctorDashboard}
        setSelectedProctorSession={setSelectedProctorSession}
        setProctorHistory={setProctorHistory}
        setProctorReason={setProctorReason}
        proctorDashboard={proctorDashboard}
        getSessionRecordId={getSessionRecordId}
        selectedProctorSessionId={selectedProctorSessionId}
        fetchProctorHistory={fetchProctorHistory}
        proctorPagination={proctorPagination}
        showProctorDetailModal={showProctorDetailModal}
        setShowProctorDetailModal={setShowProctorDetailModal}
        selectedProctorSession={selectedProctorSession}
        formatDateTime={formatDateTime}
        loadingProctorHistory={loadingProctorHistory}
        proctorHistory={proctorHistory}
        runProctorAction={runProctorAction}
        proctorReason={proctorReason}
        proctorAlerts={proctorAlerts}
        clearProctorAlerts={clearProctorAlerts}
        proctorToasts={proctorToasts}
        dismissProctorToast={dismissProctorToast}
        proctorSocketStatus={proctorSocketStatus}
        selectedProctorExamLabel={selectedProctorExamLabel}
        selectedProctorRoomLabel={selectedProctorRoomLabel}
      />

      <div className="proctor-toast-stack" aria-live="polite" aria-relevant="additions text">
        {proctorToasts.map((toast) => (
          (() => {
            const toastMeta = formatProctorToastMeta(toast)

            return (
          <div
            key={toast.id}
            className={`proctor-toast proctor-toast--${String(toast.severity || 'LOW').toLowerCase()}`}
            role="status"
          >
            <div className="proctor-toast__header">
              <strong>{toast.severity || 'LOW'}</strong>
              <button type="button" className="proctor-toast__close" onClick={() => dismissProctorToast(toast.id)} aria-label="Đóng thông báo">
                ×
              </button>
            </div>
            <p>{toast.message}</p>
            <small>
              {toastMeta.roomLabel}
              {toastMeta.userLabel ? ` • ${toastMeta.userLabel}` : ''}
              {toastMeta.citizenLabel ? ` • ${toastMeta.citizenLabel}` : ''}
              {` • ${formatDateTime(toast.timestamp)}`}
            </small>
          </div>
            )
          })()
        ))}
      </div>

      {showProctorRoomModal && (
        <div className="proctor-room-modal-overlay" onClick={closeProctorRoomModal}>
          <div className="proctor-room-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Chọn phòng thi để giám sát</h3>
            <p>Flow chuẩn: Tìm kỳ thi → tải phòng theo kỳ thi → chọn phòng để mở dashboard.</p>

            <label htmlFor="proctorExamSelect">Kỳ thi</label>
            <div className="proctor-search-field">
              <input
                type="text"
                placeholder="Tìm kỳ thi..."
                value={examSearch}
                onChange={(e) => { setExamSearch(e.target.value); setShowExamDropdown(true) }}
                onFocus={() => setShowExamDropdown(true)}
                onBlur={() => setTimeout(() => setShowExamDropdown(false), 150)}
                aria-haspopup="listbox"
              />

              {showExamDropdown && (
                <ul
                  role="listbox"
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    maxHeight: 200,
                    overflowY: 'auto',
                    background: 'white',
                    border: '1px solid #ddd',
                    zIndex: 50,
                    padding: 0,
                    margin: 0,
                    listStyle: 'none',
                  }}
                >
                  {exams
                    .filter((exam) => (exam.title || '').toLowerCase().includes((examSearch || '').toLowerCase()))
                    .map((exam) => (
                      <li
                        key={exam.id}
                        role="option"
                        onMouseDown={() => {
                          handleProctorExamDraftChange(String(exam.id))
                          setExamSearch(exam.title || '')
                          setShowExamDropdown(false)
                        }}
                        style={{ padding: '8px 12px', cursor: 'pointer' }}
                      >
                        {exam.title || 'Untitled exam'}
                      </li>
                    ))}
                </ul>
              )}
            </div>

            <label htmlFor="proctorRoomSelect">Phòng thi</label>
            <div className="proctor-search-field">
              <input
                type="text"
                placeholder="Tìm phòng..."
                value={roomSearch}
                onChange={(e) => { setRoomSearch(e.target.value); setShowRoomDropdown(true) }}
                onFocus={() => setShowRoomDropdown(true)}
                onBlur={() => setTimeout(() => setShowRoomDropdown(false), 150)}
                disabled={!proctorExamDraft}
                aria-haspopup="listbox"
              />

              {showRoomDropdown && proctorRoomOptions && (
                <ul
                  role="listbox"
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    maxHeight: 200,
                    overflowY: 'auto',
                    background: 'white',
                    border: '1px solid #ddd',
                    zIndex: 50,
                    padding: 0,
                    margin: 0,
                    listStyle: 'none',
                  }}
                >
                  {proctorRoomOptions
                    .filter((room) => (room.label || '').toLowerCase().includes((roomSearch || '').toLowerCase()))
                    .map((room) => (
                      <li
                        key={room.id}
                        role="option"
                        onMouseDown={() => {
                          setProctorRoomDraft(String(room.id))
                          setRoomSearch(room.label || '')
                          setShowRoomDropdown(false)
                        }}
                        style={{ padding: '8px 12px', cursor: 'pointer' }}
                      >
                        {room.label}
                      </li>
                    ))}
                </ul>
              )}
            </div>

            {loadingProctorRooms ? <p>Đang tải danh sách phòng...</p> : null}
            {!loadingProctorRooms && proctorExamDraft && proctorRoomOptions.length === 0 ? (
              <p>Không có phòng nào cho kỳ thi đã chọn.</p>
            ) : null}

            <div className="proctor-room-actions">
              <button type="button" className="secondary" onClick={closeProctorRoomModal}>
                Để sau
              </button>
              <button
                type="button"
                className="primary"
                onClick={applyProctorRoomSelection}
                disabled={!proctorExamDraft || !proctorRoomDraft || loadingProctorRooms}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
