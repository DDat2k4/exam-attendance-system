import { useEffect, useState } from 'react'
import { getAllExams } from '../../api/examApi'
import RegistrationsSection from '../../components/ExamHub/RegistrationsSection'
import useRegistrationSection from '../../hooks/useRegistrationSection'
import { useAuth } from '../../context/AuthContext'
import { formatExamLabel } from '../../utils/examLabel'
import { canAccess } from '../../utils/rbac'
import '../../components/ExamHub/ExamHub.css'

const REGISTRATION_PAGE_SIZE = 10

export default function RegistrationsPage() {
  const { user } = useAuth()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!error && !success) return undefined

    const timerId = window.setTimeout(() => {
      setError('')
      setSuccess('')
    }, 4000)

    return () => window.clearTimeout(timerId)
  }, [error, success])

  const canManageRegistrations = canAccess(user, {
    allowRoles: ['ADMIN'],
    allowPermissions: ['EXAM_MANAGE'],
    match: 'any',
  })

  const examOptions = exams.map((item) => ({
    id: item.id,
    label: formatExamLabel(item),
  }))

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

  async function fetchExamsByKeyword(keyword) {
    try {
      setLoading(true)
      setError('')
      const items = await getAllExams({ keyword: String(keyword || '').trim(), size: 100 })
      setExams(Array.isArray(items) ? items : [])
    } catch (err) {
      setError(err.message || 'Cannot load exams.')
    } finally {
      setLoading(false)
    }
  }

  const {
    registrationForm,
    submittingRegistration,
    registrationRows,
    loadingRegistrations,
    processingRegistrationId,
    loadingRegistrationUsers,
    registrationUserFilters,
    setRegistrationUserFilters,
    registrationUserAppliedFilters,
    selectedRegistrationUserIds,
    registrationUserPage,
    registrationUserTotalPages,
    registrationPage,
    registrationUsers,
    registrationTotalPages,
    filteredRegistrationUsers,
    fetchRegistrationUsers,
    handleSearchRegistrationUsers,
    handlePrevRegistrationUserPage,
    handleNextRegistrationUserPage,
    fetchRegistrations,
    onRegistrationChange,
    toggleRegistrationUser,
    toggleSelectAllFilteredUsers,
    handleBatchRegister,
    handleRemoveRegistration,
  } = useRegistrationSection({
    canManageRegistrations,
    setError,
    setSuccess,
    registrationPageSize: REGISTRATION_PAGE_SIZE,
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
    if (canManageRegistrations) {
      fetchExams()
    }
  }, [canManageRegistrations])

  return (
    <div className="exam-page">
      <header className="exam-header">
        <div>
          <h1>Đăng ký thí sinh</h1>
          <p className="exam-subtitle">Quản lý đăng ký thí sinh cho các kỳ thi</p>
        </div>
        {canManageRegistrations && (
          <button type="button" onClick={fetchExams} disabled={loading}>
            {loading ? 'Đang tải...' : 'Tải lại'}
          </button>
        )}
      </header>

      {error && <p className="feedback error">{error}</p>}
      {success && <p className="feedback success">{success}</p>}

      <RegistrationsSection
        handleBatchRegister={handleBatchRegister}
        registrationForm={registrationForm}
        onRegistrationChange={onRegistrationChange}
        examOptions={examOptions}
        handleSearchExams={fetchExamsByKeyword}
        registrationUserFilters={registrationUserFilters}
        setRegistrationUserFilters={setRegistrationUserFilters}
        registrationUserAppliedFilters={registrationUserAppliedFilters}
        toggleSelectAllFilteredUsers={toggleSelectAllFilteredUsers}
        loadingRegistrationUsers={loadingRegistrationUsers}
        filteredRegistrationUsers={filteredRegistrationUsers}
        fetchRegistrationUsers={fetchRegistrationUsers}
        handleSearchRegistrationUsers={handleSearchRegistrationUsers}
        registrationUserPage={registrationUserPage}
        registrationUserTotalPages={registrationUserTotalPages}
        handlePrevRegistrationUserPage={handlePrevRegistrationUserPage}
        handleNextRegistrationUserPage={handleNextRegistrationUserPage}
        selectedRegistrationUserIds={selectedRegistrationUserIds}
        toggleRegistrationUser={toggleRegistrationUser}
        submittingRegistration={submittingRegistration}
        fetchRegistrations={fetchRegistrations}
        registrationUsers={registrationUsers}
        registrationPage={registrationPage}
        loadingRegistrations={loadingRegistrations}
        registrationRows={registrationRows}
        formatDateTime={formatDateTime}
        handleRemoveRegistration={handleRemoveRegistration}
        processingRegistrationId={processingRegistrationId}
        registrationTotalPages={registrationTotalPages}
      />
    </div>
  )
}
