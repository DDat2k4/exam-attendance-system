import { useEffect, useMemo, useState } from 'react'
import {
  addUsersToExam,
  getExamRegistrationsByExam,
  removeUserFromExam,
} from '../api/examRegistrationApi'
import { getExamById } from '../api/examApi'
import { getUsers } from '../api/userApi'
import { showConfirmDialog } from '../utils/confirmDialog'

const REGISTRATION_USER_LOOKUP_SIZE = 10

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
  const [registrationUserFilters, setRegistrationUserFilters] = useState({
    username: '',
    email: '',
    name: '',
    role: 'STUDENT',
    active: '',
  })
  const [registrationUserAppliedFilters, setRegistrationUserAppliedFilters] = useState({
    role: 'STUDENT',
  })
  const [selectedRegistrationUserIds, setSelectedRegistrationUserIds] = useState([])
  const [registrationUserPage, setRegistrationUserPage] = useState(1)
  const [registrationUserTotalPages, setRegistrationUserTotalPages] = useState(0)
  const [registrationPage, setRegistrationPage] = useState(1)
  const [registrationTotalPages, setRegistrationTotalPages] = useState(0)

  const buildSearchParams = (filters = {}) => {
    const params = {
      page: 1,
      limit: REGISTRATION_USER_LOOKUP_SIZE,
    }

    const username = String(filters.username || '').trim()
    const email = String(filters.email || '').trim()
    const name = String(filters.name || '').trim()
    const role = String(filters.role || '').trim()
    const active = String(filters.active ?? '').trim()

    return {
      ...params,
      ...(username ? { username } : {}),
      ...(email ? { email } : {}),
      ...(name ? { name } : {}),
      ...(role && role !== 'ALL' ? { role } : {}),
      ...(active ? { active } : {}),
    }
  }

  const filteredRegistrationUsers = useMemo(() => registrationUsers, [registrationUsers])

  const fetchRegistrationUsers = async (filters = registrationUserAppliedFilters, page = 1) => {
    try {
      setLoadingRegistrationUsers(true)
      const result = await getUsers({
        ...buildSearchParams(filters),
        page,
      })
      setRegistrationUsers(Array.isArray(result?.items) ? result.items : [])
      setRegistrationUserPage(Number(result?.page ?? page) || page)
      setRegistrationUserTotalPages(Number(result?.totalPages ?? 0))
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách user để đăng ký.')
    } finally {
      setLoadingRegistrationUsers(false)
    }
  }

  const handlePrevRegistrationUserPage = () => {
    const nextPage = Math.max(1, registrationUserPage - 1)
    if (nextPage === registrationUserPage) return
    setSelectedRegistrationUserIds([])
    fetchRegistrationUsers(registrationUserAppliedFilters, nextPage)
  }

  const handleNextRegistrationUserPage = () => {
    const nextPage = Math.min(registrationUserTotalPages || 1, registrationUserPage + 1)
    if (nextPage === registrationUserPage) return
    setSelectedRegistrationUserIds([])
    fetchRegistrationUsers(registrationUserAppliedFilters, nextPage)
  }

  const handleSearchRegistrationUsers = async () => {
    const nextFilters = {
      ...registrationUserFilters,
      role: registrationUserFilters.role || 'STUDENT',
    }
    setRegistrationUserAppliedFilters(nextFilters)
    setSelectedRegistrationUserIds([])
    await fetchRegistrationUsers(nextFilters, 1)
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
      // If the input carries an exam title (e.g. from a selection), prefer it
      const examTitleCandidate = e.target?.dataset?.examTitle || (String(value).trim() && Number.isNaN(Number(String(value).trim())) ? String(value).trim() : undefined)
      setRegistrationForm((prev) => ({ ...prev, examId: value, ...(examTitleCandidate ? { examTitle: examTitleCandidate } : {}) }))
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
      setError('Vui lòng tìm kỳ thi để đăng ký danh sách.')
      return
    }

    if (userIds.length === 0) {
      setError('Vui lòng nhập ít nhất 1 userId hợp lệ (số nguyên dương).')
      return
    }

    try {
      setSubmittingRegistration(true)
      await addUsersToExam({ examId, userIds })
      // prefer explicit examTitle from form; otherwise fetch exam title by id
      let examTitle = registrationForm.examTitle || registrationForm.examId || examId
      if (!registrationForm.examTitle) {
        try {
          const examRes = await getExamById(examId)
          // examRes may be a response or the resource; try common locations
          const resolved = examRes?.data ?? examRes
          examTitle = resolved?.title || resolved?.name || examTitle
        } catch {
          // ignore fetch error and fall back to examId
        }
      }
      setSuccess(`Đã đăng ký ${userIds.length} user vào kỳ thi ${examTitle}.`)
      // persist title in form so subsequent actions don't need to fetch
      if (!registrationForm.examTitle && examTitle) {
        setRegistrationForm((prev) => ({ ...prev, examTitle }))
      }
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

    const ok = await showConfirmDialog(`Bạn chắc chắn muốn gỡ user ${userId} khỏi kỳ thi ${examId}?`, {
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
      setSuccess(`Đã gỡ user ${userId} khỏi kỳ thi ${examId}.`)
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
      setSelectedRegistrationUserIds([])
      setRegistrationUserFilters({
        username: '',
        email: '',
        name: '',
        role: 'STUDENT',
        active: '',
      })
      setRegistrationUserAppliedFilters({ role: 'STUDENT' })
      fetchRegistrationUsers({ role: 'STUDENT' }, 1)
    }
    return undefined
  }, [canManageRegistrations])

  return {
    registrationForm,
    submittingRegistration,
    registrationRows,
    loadingRegistrations,
    processingRegistrationId,
    registrationUsers,
    loadingRegistrationUsers,
    registrationUserFilters,
    setRegistrationUserFilters,
    registrationUserAppliedFilters,
    selectedRegistrationUserIds,
    registrationUserPage,
    registrationUserTotalPages,
    registrationPage,
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
    setSelectedRegistrationUserIds,
  }
}
