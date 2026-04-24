import { useEffect, useRef, useState } from 'react'
import {
  createExam,
  deleteExam,
  getExamsPaginated,
  updateExam,
} from '../../api/examApi'
import ExamsSection from '../../components/ExamHub/ExamsSection'
import { useAuth } from '../../context/AuthContext'
import { canAccess } from '../../utils/rbac'
import { showConfirmDialog } from '../../utils/confirmDialog'
import '../../components/ExamHub/ExamHub.css'

const INITIAL_EXAM_FORM = {
  title: '',
  description: '',
  startTime: '',
  endTime: '',
}

const EXAM_PAGE_SIZE = 10

export default function ExamsPage() {
  const { user } = useAuth()
  const [examForm, setExamForm] = useState(INITIAL_EXAM_FORM)
  const [editingExamId, setEditingExamId] = useState(null)
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(false)
  const [submittingExam, setSubmittingExam] = useState(false)
  const [updatingExam, setUpdatingExam] = useState(false)
  const [processingExamId, setProcessingExamId] = useState(null)
  const [examKeyword, setExamKeyword] = useState('')
  const [examPage, setExamPage] = useState(1)
  const [examTotalPages, setExamTotalPages] = useState(1)
  const [examTotalElements, setExamTotalElements] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const keywordInitializedRef = useRef(false)

  const canCreateExams = canAccess(user, {
    allowRoles: ['ADMIN'],
    allowPermissions: ['EXAM_CREATE', 'EXAM_MANAGE'],
    match: 'any',
  })

  const canViewExams = canAccess(user, {
    allowRoles: ['ADMIN', 'PROCTOR', 'STUDENT'],
    allowPermissions: ['EXAM_VIEW', 'EXAM_MANAGE'],
    match: 'any',
  })

  async function fetchExams(nextPage = examPage, nextKeyword = examKeyword) {
    try {
      setLoading(true)
      setError('')
      const pageNum = Math.max(1, Number(nextPage) || 1)
      const result = await getExamsPaginated({
        page: pageNum - 1,
        size: EXAM_PAGE_SIZE,
        keyword: nextKeyword,
        hydrateRooms: true,
      })

      setExams(Array.isArray(result?.content) ? result.content : [])
      setExamPage((result?.number ?? pageNum - 1) + 1)
      setExamTotalPages(Math.max(1, result?.totalPages ?? 1))
      setExamTotalElements(result?.totalElements ?? 0)
    } catch (err) {
      setExams([])
      setError(err.message || 'Cannot load exams.')
    } finally {
      setLoading(false)
    }
  }

  const onExamChange = (e) => {
    setExamForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

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

  const handleCreateExam = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!examForm.title || !examForm.startTime || !examForm.endTime) {
      setError('Vui lòng nhập đầy đủ title, startTime, endTime.')
      return
    }

    try {
      setSubmittingExam(true)
      await createExam({
        title: examForm.title,
        description: examForm.description,
        startTime: examForm.startTime,
        endTime: examForm.endTime,
      })
      setSuccess('Tạo kỳ thi thành công.')
      setExamForm(INITIAL_EXAM_FORM)
      await fetchExams(1)
    } catch (err) {
      setError(err.message || 'Tạo kỳ thi thất bại.')
    } finally {
      setSubmittingExam(false)
    }
  }

  const startEditExam = (exam) => {
    setEditingExamId(exam.id)
    setExamForm({
      title: exam.title || '',
      description: exam.description || '',
      startTime: (exam.startTime || '').slice(0, 16),
      endTime: (exam.endTime || '').slice(0, 16),
    })
  }

  const cancelEditExam = () => {
    setEditingExamId(null)
    setExamForm(INITIAL_EXAM_FORM)
  }

  const handleUpdateExam = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!editingExamId) return

    if (!examForm.title || !examForm.startTime || !examForm.endTime) {
      setError('Vui lòng nhập đầy đủ title, startTime, endTime.')
      return
    }

    try {
      setUpdatingExam(true)
      await updateExam(editingExamId, {
        title: examForm.title,
        description: examForm.description,
        startTime: examForm.startTime,
        endTime: examForm.endTime,
      })
      setSuccess('Cập nhật kỳ thi thành công.')
      cancelEditExam()
      await fetchExams(examPage)
    } catch (err) {
      setError(err.message || 'Cập nhật kỳ thi thất bại.')
    } finally {
      setUpdatingExam(false)
    }
  }

  const handleDeleteExam = async (examId) => {
    setError('')
    setSuccess('')

    const ok = await showConfirmDialog(`Bạn chắc chắn muốn xóa kỳ thi #${examId}?`, {
      title: 'Xác nhận xóa kỳ thi',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      danger: true,
    })
    if (!ok) {
      return
    }

    try {
      setProcessingExamId(examId)
      await deleteExam(examId)
      setSuccess('Đã xóa kỳ thi.')
      await fetchExams(examPage)
      if (editingExamId === examId) {
        cancelEditExam()
      }
    } catch (err) {
      setError(err.message || 'Không thể xóa kỳ thi.')
    } finally {
      setProcessingExamId(null)
    }
  }

  useEffect(() => {
    if (canViewExams) {
      fetchExams(1)
    }
  }, [canViewExams])

  useEffect(() => {
    if (!canViewExams) return

    // Skip first run because initial fetch is handled by the effect above.
    if (!keywordInitializedRef.current) {
      keywordInitializedRef.current = true
      return
    }

    const timerId = setTimeout(() => {
      fetchExams(1)
    }, 300)

    return () => clearTimeout(timerId)
  }, [examKeyword, canViewExams])

  const handleSearchExams = (e) => {
    e.preventDefault()
    fetchExams(1)
  }

  const handlePrevPage = () => {
    if (examPage <= 1 || loading) return
    fetchExams(examPage - 1)
  }

  const handleNextPage = () => {
    if (examPage >= examTotalPages || loading) return
    fetchExams(examPage + 1)
  }

  return (
    <div className="exam-page">
      <header className="exam-header">
        <div>
          <h1>Quản lý kỳ thi</h1>
          <p className="exam-subtitle">Tạo, cập nhật, xóa kỳ thi và xem danh sách tất cả kỳ thi</p>
        </div>
        {canViewExams && (
          <button type="button" onClick={() => fetchExams(examPage)} disabled={loading}>
            {loading ? 'Đang tải...' : 'Tải lại'}
          </button>
        )}
      </header>

      {error && <p className="feedback error">{error}</p>}
      {success && <p className="feedback success">{success}</p>}

      <ExamsSection
        editingExamId={editingExamId}
        examForm={examForm}
        onExamChange={onExamChange}
        handleUpdateExam={handleUpdateExam}
        handleCreateExam={handleCreateExam}
        submittingExam={submittingExam}
        updatingExam={updatingExam}
        canCreateExams={canCreateExams}
        cancelEditExam={cancelEditExam}
        canViewExams={canViewExams}
        loading={loading}
        exams={exams}
        formatDateTime={formatDateTime}
        startEditExam={startEditExam}
        handleDeleteExam={handleDeleteExam}
        processingExamId={processingExamId}
        examKeyword={examKeyword}
        setExamKeyword={setExamKeyword}
        handleSearchExams={handleSearchExams}
        examPage={examPage}
        examTotalPages={examTotalPages}
        examTotalElements={examTotalElements}
        handlePrevPage={handlePrevPage}
        handleNextPage={handleNextPage}
      />
    </div>
  )
}
