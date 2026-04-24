import { useEffect, useMemo, useState } from 'react'
import {
  addUsersToExam,
  getExamRegistrationsByExam,
  removeUserFromExam,
} from '../api/examRegistrationApi'
import { getUsers } from '../api/userApi'
import { showConfirmDialog } from '../utils/confirmDialog'

const REGISTRATION_USER_LOOKUP_SIZE = 100

export default function useRegistrationSection({
  canManageRegistrations,
  setError,
  setSuccess,
  registrationPageSize,
}) {
  const [registrationForm, setRegistrationForm] = useState({ examId: '' })
  const [submittingRegistration, setSubmittingRegistration] = useState(false)
  const [registrationRows, setRegistrationRows] = useState([])
  const [loadingRegistrations, setLoadingRegistrations] = useState(false)
  const [processingRegistrationId, setProcessingRegistrationId] = useState(null)
  const [registrationUsers, setRegistrationUsers] = useState([])
  const [loadingRegistrationUsers, setLoadingRegistrationUsers] = useState(false)
  const [registrationUserQuery, setRegistrationUserQuery] = useState('')
  const [registrationUserRole, setRegistrationUserRole] = useState('STUDENT')
  const [selectedRegistrationUserIds, setSelectedRegistrationUserIds] = useState([])
  const [registrationPage, setRegistrationPage] = useState(1)
  const [registrationTotalPages, setRegistrationTotalPages] = useState(0)

  const filteredRegistrationUsers = useMemo(() => {
    const q = String(registrationUserQuery || '').trim().toLowerCase()
    if (!q) return registrationUsers

    return registrationUsers.filter((u) => {
      const fields = [
        String(u?.id ?? ''),
        String(u?.username ?? ''),
        String(u?.email ?? ''),
        String(u?.name ?? ''),
      ]

      return fields.some((field) => field.toLowerCase().includes(q))
    })
  }, [registrationUsers, registrationUserQuery])

  const fetchRegistrationUsers = async (role = registrationUserRole) => {
    try {
      setLoadingRegistrationUsers(true)
      const result = await getUsers({
        page: 1,
        limit: REGISTRATION_USER_LOOKUP_SIZE,
        ...(role && role !== 'ALL' ? { role } : {}),
      })
      setRegistrationUsers(Array.isArray(result?.items) ? result.items : [])
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách user để đăng ký.')
    } finally {
      setLoadingRegistrationUsers(false)
    }
  }

  const fetchRegistrations = async (examIdValue, page = 1) => {
    if (!examIdValue) {
      setRegistrationRows([])
      setRegistrationPage(1)
      setRegistrationTotalPages(0)
      return
    }

    try {
      setLoadingRegistrations(true)
      const result = await getExamRegistrationsByExam({
        examId: Number(examIdValue),
        page,
        size: registrationPageSize,
      })

      const content = Array.isArray(result?.content) ? result.content : []
      const currentPage = Number(result?.number ?? page - 1) + 1
      const totalPages = Number(result?.totalPages ?? 0)

      setRegistrationRows(content)
      setRegistrationPage(Number.isNaN(currentPage) ? page : currentPage)
      setRegistrationTotalPages(Number.isNaN(totalPages) ? 0 : totalPages)
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách đã đăng ký.')
    } finally {
      setLoadingRegistrations(false)
    }
  }

  const onRegistrationChange = (e) => {
    const { name, value } = e.target

    if (name === 'examId') {
      setRegistrationForm((prev) => ({ ...prev, examId: value }))
      fetchRegistrations(value, 1)
      return
    }

    setRegistrationForm((prev) => ({ ...prev, [name]: value }))
  }

  const toggleRegistrationUser = (userId) => {
    if (!Number.isInteger(userId) || userId <= 0) return

    setSelectedRegistrationUserIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId)
      }
      return [...prev, userId]
    })
  }

  const toggleSelectAllFilteredUsers = () => {
    const filteredIds = filteredRegistrationUsers
      .map((u) => Number(u?.id))
      .filter((id) => Number.isInteger(id) && id > 0)

    if (filteredIds.length === 0) return

    const allSelected = filteredIds.every((id) => selectedRegistrationUserIds.includes(id))

    if (allSelected) {
      setSelectedRegistrationUserIds((prev) => prev.filter((id) => !filteredIds.includes(id)))
      return
    }

    setSelectedRegistrationUserIds((prev) => [...new Set([...prev, ...filteredIds])])
  }

  const handleBatchRegister = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const examId = Number(registrationForm.examId)
    const userIds = selectedRegistrationUserIds

    if (!examId) {
      setError('Vui lòng chọn kỳ thi để đăng ký danh sách.')
      return
    }

    if (userIds.length === 0) {
      setError('Vui lòng nhập ít nhất 1 userId hợp lệ (số nguyên dương).')
      return
    }

    try {
      setSubmittingRegistration(true)
      await addUsersToExam({ examId, userIds })
      setSuccess(`Đã đăng ký ${userIds.length} user vào kỳ thi #${examId}.`)
      setSelectedRegistrationUserIds([])
      await fetchRegistrations(examId, 1)
    } catch (err) {
      setError(err.message || 'Không thể đăng ký danh sách user vào kỳ thi.')
    } finally {
      setSubmittingRegistration(false)
    }
  }

  const handleRemoveRegistration = async (row) => {
    setError('')
    setSuccess('')

    const examId = Number(row?.examId)
    const userId = Number(row?.userId)
    const registrationId = row?.id

    if (!examId || !userId) {
      setError('Không đủ thông tin examId/userId để gỡ đăng ký.')
      return
    }

    const ok = await showConfirmDialog(`Bạn chắc chắn muốn gỡ user #${userId} khỏi kỳ thi #${examId}?`, {
      title: 'Xác nhận gỡ đăng ký',
      confirmText: 'Gỡ',
      cancelText: 'Hủy',
      danger: true,
    })
    if (!ok) {
      return
    }

    try {
      setProcessingRegistrationId(registrationId ?? `${examId}-${userId}`)
      await removeUserFromExam({ examId, userId })
      setSuccess(`Đã gỡ user #${userId} khỏi kỳ thi #${examId}.`)
      const hasPreviousPageData = registrationRows.length === 1 && registrationPage > 1
      const nextPage = hasPreviousPageData ? registrationPage - 1 : registrationPage
      await fetchRegistrations(registrationForm.examId, nextPage)
    } catch (err) {
      setError(err.message || 'Không thể gỡ user khỏi kỳ thi.')
    } finally {
      setProcessingRegistrationId(null)
    }
  }

  useEffect(() => {
    if (canManageRegistrations) {
      fetchRegistrationUsers()
    }
  }, [canManageRegistrations])

  useEffect(() => {
    if (canManageRegistrations) {
      setSelectedRegistrationUserIds([])
      fetchRegistrationUsers(registrationUserRole)
    }
  }, [registrationUserRole, canManageRegistrations])

  return {
    registrationForm,
    submittingRegistration,
    registrationRows,
    loadingRegistrations,
    processingRegistrationId,
    registrationUsers,
    loadingRegistrationUsers,
    registrationUserQuery,
    setRegistrationUserQuery,
    registrationUserRole,
    setRegistrationUserRole,
    selectedRegistrationUserIds,
    registrationPage,
    registrationTotalPages,
    filteredRegistrationUsers,
    fetchRegistrationUsers,
    fetchRegistrations,
    onRegistrationChange,
    toggleRegistrationUser,
    toggleSelectAllFilteredUsers,
    handleBatchRegister,
    handleRemoveRegistration,
    setSelectedRegistrationUserIds,
  }
}
