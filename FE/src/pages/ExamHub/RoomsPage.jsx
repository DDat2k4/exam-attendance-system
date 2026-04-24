import { useEffect, useMemo, useState } from 'react'
import {
  getAllExams,
} from '../../api/examApi'
import { createExamRoom, deleteExamRoom, updateExamRoom, getRoomsByExamPaginated } from '../../api/examRoomApi'
import RoomsSection from '../../components/ExamHub/RoomsSection'
import { useAuth } from '../../context/AuthContext'
import { canAccess } from '../../utils/rbac'
import { showConfirmDialog } from '../../utils/confirmDialog'
import '../../components/ExamHub/ExamHub.css'

const INITIAL_ROOM_FORM = {
  examId: '',
  roomCode: '',
  maxStudents: '',
}

const ROOM_PAGE_SIZE = 10

export default function RoomsPage() {
  const { user } = useAuth()
  const [roomForm, setRoomForm] = useState(INITIAL_ROOM_FORM)
  const [exams, setExams] = useState([])
  const [roomRows, setRoomRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [submittingRoom, setSubmittingRoom] = useState(false)
  const [processingExamId, setProcessingExamId] = useState(null)
  const [editingRoomId, setEditingRoomId] = useState(null)
  const [examPaginationState, setExamPaginationState] = useState({}) // { [examId]: { currentPage, totalPages } }
  const [loadingMoreRoomExamId, setLoadingMoreRoomExamId] = useState(null)
  const [roomFilterCode, setRoomFilterCode] = useState('') // lọc theo mã phòng
  const [roomFilterExamId, setRoomFilterExamId] = useState('') // lọc theo kỳ thi
  const [roomFilterMaxStudents, setRoomFilterMaxStudents] = useState('') // lọc theo số lượng tối đa
  const [roomPage, setRoomPage] = useState(1)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const examOptions = useMemo(
    () => exams.map((item) => ({ id: item.id, label: item.title || 'Untitled exam' })),
    [exams],
  )

  // Filter roomRows by multiple criteria
  const filteredRoomRows = useMemo(() => {
    let resolvedExamId = ''
    const examKeyword = String(roomFilterExamId || '').trim()
    if (examKeyword) {
      const numericExamId = Number(examKeyword)
      if (Number.isInteger(numericExamId) && numericExamId > 0) {
        resolvedExamId = String(numericExamId)
      } else {
        const matched = examOptions.find((opt) => opt.label.toLowerCase().includes(examKeyword.toLowerCase()))
        resolvedExamId = matched ? String(matched.id) : '__NO_MATCH__'
      }
    }

    return roomRows.filter((row) => {
      // Filter by room code
      if (roomFilterCode.trim()) {
        const code = (row.room?.roomCode || row.room?.code || '').toLowerCase()
        if (!code.includes(roomFilterCode.toLowerCase().trim())) return false
      }
      
      // Filter by exam (roomFilterExamId may be exam id or typed exam name)
      if (resolvedExamId === '__NO_MATCH__') return false
      if (resolvedExamId) {
        if (row.examId !== Number(resolvedExamId)) return false
      }
      
      // Filter by max students
      if (roomFilterMaxStudents.trim()) {
        const maxStudents = Number(roomFilterMaxStudents)
        if (row.room?.maxStudents !== maxStudents) return false
      }
      
      return true
    })
  }, [roomRows, roomFilterCode, roomFilterExamId, roomFilterMaxStudents, examOptions])

  const roomTotalCount = filteredRoomRows.length
  const roomTotalPages = Math.max(1, Math.ceil(roomTotalCount / ROOM_PAGE_SIZE))
  const paginatedRoomRows = useMemo(() => {
    const safePage = Math.min(Math.max(1, roomPage), roomTotalPages)
    const start = (safePage - 1) * ROOM_PAGE_SIZE
    return filteredRoomRows.slice(start, start + ROOM_PAGE_SIZE)
  }, [filteredRoomRows, roomPage, roomTotalPages])

  const canCreateRooms = canAccess(user, {
    allowRoles: ['ADMIN', 'PROCTOR'],
    allowPermissions: ['ROOM_CREATE', 'EXAM_MANAGE'],
    match: 'any',
  })

  async function fetchExams() {
    try {
      setLoading(true)
      setError('')
      const items = await getAllExams()
      const examList = Array.isArray(items) ? items : []
      setExams(examList)

      const rowsByExam = await Promise.all(
        examList.map(async (exam) => {
          try {
            const paginatedData = await getRoomsByExamPaginated(exam.id, 0, 10)
            const rooms = paginatedData?.content || []
            const totalPages = paginatedData?.totalPages || 0
            const totalElements = paginatedData?.totalElements || rooms.length

            // Lưu pagination state cho exam này
            setExamPaginationState((prev) => ({
              ...prev,
              [exam.id]: { currentPage: 0, totalPages, totalElements },
            }))

            return (Array.isArray(rooms) ? rooms : []).map((room) => ({
              examId: exam.id,
              examTitle: exam.title,
              room,
              roomId: room.id ?? room.roomId,
            }))
          } catch {
            return []
          }
        }),
      )

      setRoomRows(rowsByExam.flat())
      setRoomPage(1)
    } catch (err) {
      setExams([])
      setRoomRows([])
      setError(err.message || 'Cannot load exams.')
    } finally {
      setLoading(false)
    }
  }

  const onRoomChange = (e) => {
    setRoomForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleCreateRoom = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!roomForm.examId || !roomForm.roomCode || !roomForm.maxStudents) {
      setError('Vui lòng nhập đầy đủ exam, room code và max students.')
      return
    }

    try {
      setSubmittingRoom(true)
      if (editingRoomId) {
        await updateExamRoom(editingRoomId, {
          examId: Number(roomForm.examId),
          roomCode: roomForm.roomCode,
          maxStudents: Number(roomForm.maxStudents),
        })
        setSuccess('Cập nhật phòng thi thành công.')
      } else {
        await createExamRoom({
          examId: Number(roomForm.examId),
          roomCode: roomForm.roomCode,
          maxStudents: Number(roomForm.maxStudents),
        })
        setSuccess('Tạo phòng thi thành công.')
      }

      setRoomForm(INITIAL_ROOM_FORM)
      setEditingRoomId(null)
      await fetchExams()
    } catch (err) {
      setError(err.message || (editingRoomId ? 'Cập nhật phòng thi thất bại.' : 'Tạo phòng thi thất bại.'))
    } finally {
      setSubmittingRoom(false)
    }
  }

  const handleSelectEditRoom = ({ roomId, examId, roomCode, maxStudents }) => {
    if (!roomId) {
      setError('Không tìm thấy roomId hợp lệ để cập nhật phòng thi.')
      return
    }

    setError('')
    setSuccess('')
    setEditingRoomId(roomId)
    setRoomForm({
      examId: String(examId ?? ''),
      roomCode: roomCode || '',
      maxStudents: String(maxStudents ?? ''),
    })
  }

  const handleCancelEditRoom = () => {
    setEditingRoomId(null)
    setRoomForm(INITIAL_ROOM_FORM)
    setError('')
    setSuccess('Đã hủy chỉnh sửa phòng thi.')
  }

  const handlePrevRoomPage = () => {
    setRoomPage((prev) => Math.max(1, prev - 1))
  }

  const handleNextRoomPage = () => {
    setRoomPage((prev) => Math.min(roomTotalPages, prev + 1))
  }

  const loadMoreRoomsForExam = async (examId) => {
    const examTitle = exams.find((e) => e.id === examId)?.title || `#${examId}`
    const paginationInfo = examPaginationState[examId] || { currentPage: 0, totalPages: 0, totalElements: 0 }

    if (paginationInfo.currentPage + 1 >= paginationInfo.totalPages) {
      setSuccess(`Đã hiển thị tất cả phòng thi của kỳ ${examTitle}.`)
      return
    }

    setError('')

    try {
      setLoadingMoreRoomExamId(examId)
      const nextPage = paginationInfo.currentPage + 1
      const paginatedData = await getRoomsByExamPaginated(examId, nextPage, 10)
      const newRooms = paginatedData?.content || []
      const totalElements = paginatedData?.totalElements || paginationInfo.totalElements || 0

      const newRows = (Array.isArray(newRooms) ? newRooms : []).map((room) => ({
        examId,
        examTitle,
        room,
        roomId: room.id ?? room.roomId,
      }))

      setRoomRows((prev) => [...prev, ...newRows])
      setExamPaginationState((prev) => ({
        ...prev,
        [examId]: {
          currentPage: nextPage,
          totalPages: paginatedData?.totalPages || 0,
          totalElements,
        },
      }))

      setSuccess(`Tải thêm phòng thi từ ${examTitle}.`)
    } catch (err) {
      setError(err.message || 'Không thể tải thêm phòng thi.')
    } finally {
      setLoadingMoreRoomExamId(null)
    }
  }

  const handleDeleteRoom = async (roomId) => {
    setError('')
    setSuccess('')
    if (!roomId) {
      setError('Không tìm thấy roomId hợp lệ để xóa phòng thi.')
      return
    }

    const ok = await showConfirmDialog(`Bạn chắc chắn muốn xóa phòng thi #${roomId}?`, {
      title: 'Xác nhận xóa phòng thi',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      danger: true,
    })
    if (!ok) {
      return
    }

    try {
      setProcessingExamId(roomId)
      await deleteExamRoom(roomId)
      setSuccess('Đã xóa phòng thi.')
      await fetchExams()
    } catch (err) {
      setError(err.message || 'Không thể xóa phòng thi.')
    } finally {
      setProcessingExamId(null)
    }
  }

  useEffect(() => {
    if (canCreateRooms) {
      fetchExams()
    }
  }, [canCreateRooms])

  useEffect(() => {
    setRoomPage(1)
  }, [roomFilterCode, roomFilterExamId, roomFilterMaxStudents])

  return (
    <div className="exam-page">
      <header className="exam-header">
        <div>
          <h1>Quản lý phòng thi</h1>
          <p className="exam-subtitle">Tạo, xem, xóa phòng thi liên kết với các kỳ thi</p>
        </div>
        <button type="button" onClick={fetchExams} disabled={loading}>
          {loading ? 'Đang tải...' : 'Tải lại'}
        </button>
      </header>

      {error && <p className="feedback error">{error}</p>}
      {success && <p className="feedback success">{success}</p>}

      <RoomsSection
        roomForm={roomForm}
        onRoomChange={onRoomChange}
        examOptions={examOptions}
        submittingRoom={submittingRoom}
        canCreateRooms={canCreateRooms}
        editingRoomId={editingRoomId}
        roomRows={paginatedRoomRows}
        handleCreateRoom={handleCreateRoom}
        handleSelectEditRoom={handleSelectEditRoom}
        handleCancelEditRoom={handleCancelEditRoom}
        handleDeleteRoom={handleDeleteRoom}
        processingExamId={processingExamId}
        roomFilterCode={roomFilterCode}
        setRoomFilterCode={setRoomFilterCode}
        roomFilterExamId={roomFilterExamId}
        setRoomFilterExamId={setRoomFilterExamId}
        roomFilterMaxStudents={roomFilterMaxStudents}
        setRoomFilterMaxStudents={setRoomFilterMaxStudents}
        roomCurrentPage={roomPage}
        roomTotalPages={roomTotalPages}
        roomTotalCount={roomTotalCount}
        handlePrevRoomPage={handlePrevRoomPage}
        handleNextRoomPage={handleNextRoomPage}
      />
    </div>
  )
}
