import { useEffect, useMemo, useState } from 'react'
import {
  getAllExams,
} from '../../api/examApi'
import { createExamRoom, deleteExamRoom, updateExamRoom, getRoomsByExamPaginated, assignExamRoomBatch, getStudentsInRoom } from '../../api/examRoomApi'
import { getExamRegistrationsByExam } from '../../api/examRegistrationApi'
import { getUserProfiles } from '../../api/userProfileApi'
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
const ASSIGNMENT_REGISTRATION_PAGE_SIZE = 100
const ROOM_STUDENTS_PAGE_SIZE = 100
const PROFILE_LOOKUP_PAGE_SIZE = 100

const getProfileDisplayName = (profile, fallbackUserId) => profile?.name || profile?.fullName || `User #${fallbackUserId}`

const loadProfilesByUserIds = async (userIds = []) => {
  const uniqueUserIds = [...new Set(userIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))]
  if (uniqueUserIds.length === 0) return new Map()

  const remaining = new Set(uniqueUserIds)
  const profileMap = new Map()
  let page = 1
  let totalPages = 1

  while (remaining.size > 0 && page <= totalPages) {
    const result = await getUserProfiles({ page, size: PROFILE_LOOKUP_PAGE_SIZE })
    const items = Array.isArray(result?.items) ? result.items : []

    for (const profile of items) {
      const profileUserId = Number(profile?.userId)
      if (!Number.isInteger(profileUserId) || !remaining.has(profileUserId)) continue

      profileMap.set(profileUserId, profile)
      remaining.delete(profileUserId)
    }

    totalPages = Math.max(1, Math.ceil(Number(result?.total || 0) / PROFILE_LOOKUP_PAGE_SIZE))
    page += 1
  }

  return profileMap
}

export default function RoomsPage() {
  const { user } = useAuth()
  const [roomForm, setRoomForm] = useState(INITIAL_ROOM_FORM)
  const [exams, setExams] = useState([])
  const [roomRows, setRoomRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [submittingRoom, setSubmittingRoom] = useState(false)
  const [processingExamId, setProcessingExamId] = useState(null)
  const [editingRoomId, setEditingRoomId] = useState(null)
  const [roomFilterCode, setRoomFilterCode] = useState('') // lọc theo mã phòng
  const [roomFilterExamId, setRoomFilterExamId] = useState('') // lọc theo kỳ thi
  const [roomFilterMaxStudents, setRoomFilterMaxStudents] = useState('') // lọc theo số lượng tối đa
  const [roomPage, setRoomPage] = useState(1)
  const [showAssignRoomModal, setShowAssignRoomModal] = useState(false)
  const [assignRoomTarget, setAssignRoomTarget] = useState(null)
  const [assignableRegistrations, setAssignableRegistrations] = useState([])
  const [loadingAssignableRegistrations, setLoadingAssignableRegistrations] = useState(false)
  const [assignRegistrationQuery, setAssignRegistrationQuery] = useState('')
  const [pendingRoomAssignments, setPendingRoomAssignments] = useState([])
  const [submittingRoomAssignment, setSubmittingRoomAssignment] = useState(false)
  const [assignRoomError, setAssignRoomError] = useState('')
  const [showRoomStudentsModal, setShowRoomStudentsModal] = useState(false)
  const [roomStudentsTarget, setRoomStudentsTarget] = useState(null)
  const [roomStudents, setRoomStudents] = useState([])
  const [loadingRoomStudents, setLoadingRoomStudents] = useState(false)
  const [roomStudentsError, setRoomStudentsError] = useState('')
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

  const handleOpenAssignRoom = async ({ roomId, examId, roomCode, examTitle }) => {
    const parsedRoomId = Number(roomId)
    const parsedExamId = Number(examId)

    if (!Number.isInteger(parsedRoomId) || parsedRoomId <= 0 || !Number.isInteger(parsedExamId) || parsedExamId <= 0) {
      setError('Không xác định được phòng hoặc kỳ thi để gán phòng.')
      return
    }

    setError('')
    setSuccess('')
    setAssignRoomTarget({ roomId: parsedRoomId, examId: parsedExamId, roomCode: roomCode || '', examTitle: examTitle || `#${parsedExamId}` })
    setAssignRegistrationQuery('')
    setPendingRoomAssignments([])
    setAssignRoomError('')
    setAssignableRegistrations([])
    setShowAssignRoomModal(true)

    try {
      setLoadingAssignableRegistrations(true)
      const result = await getExamRegistrationsByExam({
        examId: parsedExamId,
        page: 1,
        size: ASSIGNMENT_REGISTRATION_PAGE_SIZE,
      })

      const baseRows = Array.isArray(result?.content) ? result.content : []
      const profileMap = await loadProfilesByUserIds(baseRows.map((row) => row?.userId))
      const enrichedRows = baseRows.map((row) => {
        const userId = Number(row?.userId)
        const profile = profileMap.get(userId) || null

        return {
          ...row,
          userFullName: profile?.name || profile?.fullName || '',
          userCitizenId: profile?.citizenId || '',
          userDisplayName: getProfileDisplayName(profile, userId),
        }
      })

      setAssignableRegistrations(enrichedRows)
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách đăng ký để gán phòng.')
      setAssignableRegistrations([])
    } finally {
      setLoadingAssignableRegistrations(false)
    }
  }

  const handleCloseAssignRoom = () => {
    setShowAssignRoomModal(false)
    setAssignRoomTarget(null)
    setAssignableRegistrations([])
    setAssignRegistrationQuery('')
    setPendingRoomAssignments([])
    setAssignRoomError('')
  }

  const handleAddRoomAssignment = (row) => {
    const registrationId = Number(row?.id)
    if (!Number.isInteger(registrationId) || registrationId <= 0) {
      setAssignRoomError('Không thể thêm registration không hợp lệ.')
      return
    }

    setAssignRoomError('')
    setPendingRoomAssignments((prev) => {
      if (prev.some((item) => Number(item.registrationId) === registrationId)) {
        return prev
      }

      return [
        ...prev,
        {
          registrationId,
          seatNumber: '',
          label: row?.userDisplayName || row?.userFullName || row?.userUsername || `User #${row?.userId}`,
          meta: [
            row?.userUsername ? `@${row.userUsername}` : '',
            row?.userEmail || '',
            row?.userCitizenId ? `CCCD: ${row.userCitizenId}` : '',
            row?.status || 'PENDING',
          ].filter(Boolean).join(' · '),
        },
      ]
    })
    setAssignRegistrationQuery('')
  }

  const handleUpdateRoomAssignmentSeat = (registrationId, seatNumber) => {
    setPendingRoomAssignments((prev) => prev.map((item) => (
      Number(item.registrationId) === Number(registrationId)
        ? { ...item, seatNumber }
        : item
    )))
  }

  const handleRemoveRoomAssignment = (registrationId) => {
    setPendingRoomAssignments((prev) => prev.filter((item) => Number(item.registrationId) !== Number(registrationId)))
  }

  const handleOpenRoomStudents = async ({ roomId, roomCode, examTitle }) => {
    const parsedRoomId = Number(roomId)

    if (!Number.isInteger(parsedRoomId) || parsedRoomId <= 0) {
      setError('Không xác định được roomId hợp lệ để xem sinh viên.')
      return
    }

    setError('')
    setSuccess('')
    setRoomStudentsTarget({ roomId: parsedRoomId, roomCode: roomCode || '', examTitle: examTitle || '' })
    setRoomStudents([])
    setRoomStudentsError('')
    setShowRoomStudentsModal(true)

    try {
      setLoadingRoomStudents(true)
      const result = await getStudentsInRoom({ roomId: parsedRoomId, page: 0, size: ROOM_STUDENTS_PAGE_SIZE })
      setRoomStudents(Array.isArray(result?.content) ? result.content : [])
    } catch (err) {
      setRoomStudentsError(err.message || 'Không thể tải danh sách sinh viên trong phòng.')
      setRoomStudents([])
    } finally {
      setLoadingRoomStudents(false)
    }
  }

  const handleCloseRoomStudents = () => {
    setShowRoomStudentsModal(false)
    setRoomStudentsTarget(null)
    setRoomStudents([])
    setLoadingRoomStudents(false)
    setRoomStudentsError('')
  }

  const handleAssignRoom = async (e) => {
    e.preventDefault()

    const roomId = Number(assignRoomTarget?.roomId)

    const students = pendingRoomAssignments.map((item) => ({
      registrationId: item.registrationId,
      seatNumber: Number(item.seatNumber),
    }))

    if (!Number.isInteger(roomId) || roomId <= 0) {
      setAssignRoomError('Không tìm thấy roomId hợp lệ.')
      return
    }

    if (students.length === 0) {
      setAssignRoomError('Vui lòng thêm ít nhất 1 sinh viên vào danh sách gán.')
      return
    }

    const invalidItem = students.find((item) => !Number.isInteger(item.seatNumber) || item.seatNumber <= 0)
    if (invalidItem) {
      setAssignRoomError('Vui lòng nhập số ghế hợp lệ cho tất cả sinh viên.')
      return
    }

    try {
      setSubmittingRoomAssignment(true)
      setAssignRoomError('')
      setSuccess('')
      await assignExamRoomBatch({ roomId, students })
      await fetchExams()
      setSuccess(`Đã gán ${students.length} sinh viên vào phòng #${roomId}.`)
      handleCloseAssignRoom()
    } catch (err) {
      setAssignRoomError(err.message || 'Không thể gán phòng thi.')
    } finally {
      setSubmittingRoomAssignment(false)
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
        showAssignRoomModal={showAssignRoomModal}
        assignRoomTarget={assignRoomTarget}
        assignableRegistrations={assignableRegistrations}
        loadingAssignableRegistrations={loadingAssignableRegistrations}
        assignRegistrationQuery={assignRegistrationQuery}
        setAssignRegistrationQuery={setAssignRegistrationQuery}
        pendingRoomAssignments={pendingRoomAssignments}
        handleAddRoomAssignment={handleAddRoomAssignment}
        handleUpdateRoomAssignmentSeat={handleUpdateRoomAssignmentSeat}
        handleRemoveRoomAssignment={handleRemoveRoomAssignment}
        submittingRoomAssignment={submittingRoomAssignment}
        assignRoomError={assignRoomError}
        showRoomStudentsModal={showRoomStudentsModal}
        roomStudentsTarget={roomStudentsTarget}
        roomStudents={roomStudents}
        loadingRoomStudents={loadingRoomStudents}
        roomStudentsError={roomStudentsError}
        handleOpenAssignRoom={handleOpenAssignRoom}
        handleCloseAssignRoom={handleCloseAssignRoom}
        handleAssignRoom={handleAssignRoom}
        handleOpenRoomStudents={handleOpenRoomStudents}
        handleCloseRoomStudents={handleCloseRoomStudents}
      />
    </div>
  )
}
