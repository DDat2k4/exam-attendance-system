import { useEffect, useState } from 'react'
import { getAllExams } from '../../api/examApi'
import ProctorSection from '../../components/ExamHub/ProctorSection'
import useProctorSection, { PROCTOR_STATUS_OPTIONS } from '../../hooks/useProctorSection'
import { useAuth } from '../../context/AuthContext'
import { canAccess } from '../../utils/rbac'
import '../../components/ExamHub/ExamHub.css'

const HUB_SECTIONS = {
  PROCTOR: 'proctor',
}

export default function ProctorPage() {
  const { user } = useAuth()
  const [exams, setExams] = useState([])
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
      const items = await getAllExams()
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
    proctorRoomFilterOptions,
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
        proctorRoomFilterOptions={proctorRoomFilterOptions}
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
      />

      <div className="proctor-toast-stack" aria-live="polite" aria-relevant="additions text">
        {proctorToasts.map((toast) => (
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
              Room #{toast.roomId || '-'} • User #{toast.userId || '-'} • {formatDateTime(toast.timestamp)}
            </small>
          </div>
        ))}
      </div>

      {showProctorRoomModal && (
        <div className="proctor-room-modal-overlay" onClick={closeProctorRoomModal}>
          <div className="proctor-room-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Chọn phòng thi để giám sát</h3>
            <p>Flow chuẩn: Chọn kỳ thi → tải phòng theo kỳ thi → chọn phòng để mở dashboard.</p>

            <label htmlFor="proctorExamSelect">Kỳ thi</label>
            <select
              id="proctorExamSelect"
              value={proctorExamDraft}
              onChange={(e) => handleProctorExamDraftChange(e.target.value)}
            >
              <option value="">Chọn kỳ thi</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title || 'Untitled exam'}
                </option>
              ))}
            </select>

            <label htmlFor="proctorRoomSelect">Phòng thi</label>
            <select
              id="proctorRoomSelect"
              value={proctorRoomDraft}
              onChange={(e) => setProctorRoomDraft(e.target.value)}
              disabled={!proctorExamDraft || loadingProctorRooms}
            >
              <option value="">Chọn roomId</option>
              {proctorRoomOptions.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.label}
                </option>
              ))}
            </select>

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
