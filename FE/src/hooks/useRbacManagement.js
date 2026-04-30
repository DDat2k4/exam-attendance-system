import { useEffect, useMemo, useRef, useState } from 'react'
import { createPermission, deletePermission, getPermissions, updatePermission } from '../api/permissionApi'
import { createRole, deleteRole, getRoles, updateRole } from '../api/roleApi'
import {
  addPermissionsToRole,
  getRolePermissions,
  removePermissionFromRole,
  replaceRolePermissions,
} from '../api/rolePermissionApi'
import { getUserRoles, replaceUserRoles } from '../api/userRoleApi'
import { getUsers } from '../api/userApi'
import { showConfirmDialog } from '../utils/confirmDialog'

export const DEFAULT_PAGE_SIZE = 10
const USER_LOOKUP_SIZE = 100
const ROLE_LOOKUP_PAGE_SIZE = 100

const emptyRoleForm = { name: '', description: '' }
const emptyPermissionForm = { resource: '', action: '', description: '' }
const ASSIGNMENT_PERMISSION_PAGE_SIZE = 100

export default function useRbacManagement(options = {}) {
  const mode = options?.mode || 'full'
  const isPermissionsOnlyMode = mode === 'permissions'
  const isRolesOnlyMode = mode === 'roles'
  const isFullMode = !isPermissionsOnlyMode && !isRolesOnlyMode

  const hasLoadedInitialDataRef = useRef(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [roleNameFilter, setRoleNameFilter] = useState('')
  const [rolePage, setRolePage] = useState(1)
  const [rolePageSize, setRolePageSize] = useState(DEFAULT_PAGE_SIZE)
  const [roleTotalPages, setRoleTotalPages] = useState(0)
  const [roleTotalElements, setRoleTotalElements] = useState(0)
  const [roleNumberOfElements, setRoleNumberOfElements] = useState(0)
  const [roleIsFirst, setRoleIsFirst] = useState(true)
  const [roleIsLast, setRoleIsLast] = useState(true)
  const [roles, setRoles] = useState([])
  const [allRoles, setAllRoles] = useState([])
  const [roleForm, setRoleForm] = useState(emptyRoleForm)
  const [editingRoleId, setEditingRoleId] = useState(null)

  const [permissionCodeFilter, setPermissionCodeFilter] = useState('')
  const [permissionPage, setPermissionPage] = useState(1)
  const [permissionPageSize, setPermissionPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [permissionTotalPages, setPermissionTotalPages] = useState(0)
  const [permissionTotalElements, setPermissionTotalElements] = useState(0)
  const [permissionNumberOfElements, setPermissionNumberOfElements] = useState(0)
  const [permissionIsFirst, setPermissionIsFirst] = useState(true)
  const [permissionIsLast, setPermissionIsLast] = useState(true)
  const [permissions, setPermissions] = useState([])
  const [assignmentPermissions, setAssignmentPermissions] = useState([])
  const [assignmentPermissionPage, setAssignmentPermissionPage] = useState(1)
  const [assignmentPermissionPageSize, setAssignmentPermissionPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [permissionForm, setPermissionForm] = useState(emptyPermissionForm)
  const [editingPermissionId, setEditingPermissionId] = useState(null)

  const [selectedRoleId, setSelectedRoleId] = useState(null)
  const [selectedRolePermissionIds, setSelectedRolePermissionIds] = useState(new Set())

  const [users, setUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [selectedUserRoleIds, setSelectedUserRoleIds] = useState(new Set())
  const [roleSelectorInput, setRoleSelectorInput] = useState('')
  const [userSelectorInput, setUserSelectorInput] = useState('')
  const [assignmentPermissionSearch, setAssignmentPermissionSearch] = useState('')
  const [assignmentRoleSearch, setAssignmentRoleSearch] = useState('')

  const availableRoleOptions = useMemo(
    () => allRoles.map((role) => ({ id: Number(role.id), label: role.name || role.code || `Role #${role.id}` })),
    [allRoles],
  )

  const roleSelectorOptions = useMemo(
    () => availableRoleOptions.map((item) => ({ ...item, display: `${item.id} - ${item.label}` })),
    [availableRoleOptions],
  )

  const userSelectorOptions = useMemo(
    () =>
      users.map((user) => {
        const label = user.username || user.email || `User #${user.id}`
        return {
          id: Number(user.id),
          label,
          display: `${user.id} - ${label}`,
        }
      }),
    [users],
  )

  const filteredAssignmentPermissions = useMemo(() => {
    const keyword = assignmentPermissionSearch.trim().toLowerCase()
    if (!keyword) return assignmentPermissions
    return assignmentPermissions.filter((item) => {
      const code = String(item?.code || '').toLowerCase()
      const resource = String(item?.resource || '').toLowerCase()
      const action = String(item?.action || '').toLowerCase()
      const description = String(item?.description || '').toLowerCase()
      const id = String(item?.id || '')
      return (
        code.includes(keyword) ||
        resource.includes(keyword) ||
        action.includes(keyword) ||
        description.includes(keyword) ||
        id.includes(keyword)
      )
    })
  }, [assignmentPermissions, assignmentPermissionSearch])

  const assignmentPermissionTotalPages = useMemo(() => {
    if (filteredAssignmentPermissions.length === 0) return 0
    return Math.ceil(filteredAssignmentPermissions.length / assignmentPermissionPageSize)
  }, [filteredAssignmentPermissions.length, assignmentPermissionPageSize])

  const paginatedAssignmentPermissions = useMemo(() => {
    if (filteredAssignmentPermissions.length === 0) return []
    const startIndex = (assignmentPermissionPage - 1) * assignmentPermissionPageSize
    return filteredAssignmentPermissions.slice(startIndex, startIndex + assignmentPermissionPageSize)
  }, [assignmentPermissionPage, assignmentPermissionPageSize, filteredAssignmentPermissions])

  const assignmentPermissionIsFirst = assignmentPermissionPage <= 1
  const assignmentPermissionIsLast =
    assignmentPermissionTotalPages === 0 || assignmentPermissionPage >= assignmentPermissionTotalPages

  const filteredRoleSelectorOptions = useMemo(() => {
    const keyword = roleSelectorInput.trim().toLowerCase()
    if (!keyword) return roleSelectorOptions
    return roleSelectorOptions.filter(
      (item) => String(item?.label || '').toLowerCase().includes(keyword) || String(item?.id || '').includes(keyword),
    )
  }, [roleSelectorOptions, roleSelectorInput])

  const filteredUsers = useMemo(() => {
    const keyword = userSelectorInput.trim().toLowerCase()
    if (!keyword) return userSelectorOptions
    return userSelectorOptions.filter((item) => {
      const label = String(item?.label || '').toLowerCase()
      const display = String(item?.display || '').toLowerCase()
      const id = String(item?.id || '')
      return label.includes(keyword) || display.includes(keyword) || id.includes(keyword)
    })
  }, [userSelectorOptions, userSelectorInput])

  const filteredAssignmentRoles = useMemo(() => {
    const keyword = assignmentRoleSearch.trim().toLowerCase()
    if (!keyword) return availableRoleOptions
    return availableRoleOptions.filter(
      (item) => String(item?.label || '').toLowerCase().includes(keyword) || String(item?.id || '').includes(keyword),
    )
  }, [availableRoleOptions, assignmentRoleSearch])

  const clearNotice = () => {
    setError('')
    setMessage('')
  }

  const clampAssignmentPermissionPage = (nextPage) => {
    const totalPages = assignmentPermissionTotalPages || 1
    const normalizedPage = Math.min(Math.max(Number(nextPage) || 1, 1), totalPages)
    setAssignmentPermissionPage(normalizedPage)
  }

  const fetchRoles = async (page = rolePage, name = roleNameFilter, pageSize = rolePageSize) => {
    const result = await getRoles({
      page,
      limit: pageSize,
      filters: { name: name || undefined },
    })
    setRoles(result.items || [])
    setRoleTotalPages(Number(result.totalPages || 0))
    setRolePage(Number(result.page || page))
    setRoleTotalElements(Number(result.meta?.totalElements ?? result.total ?? 0))
    setRoleNumberOfElements(Number(result.meta?.numberOfElements ?? result.items?.length ?? 0))
    const fallbackIsLast =
      Number(result.totalPages || 0) <= 1 ||
      Number(result.page || page) >= Number(result.totalPages || 0)
    setRoleIsFirst(Boolean(result.meta?.first ?? Number(result.page || page) <= 1))
    setRoleIsLast(Boolean(result.meta?.last ?? fallbackIsLast))
    return result
  }

  const handleRolePageChange = async (nextPage) => {
    const totalPages = Math.max(Number(roleTotalPages || 0), 1)
    const normalizedPage = Math.min(Math.max(Number(nextPage) || 1, 1), totalPages)

    setLoading(true)
    clearNotice()
    try {
      await fetchRoles(normalizedPage, roleNameFilter, rolePageSize)
    } catch (err) {
      setError(err.message || 'Không tải được danh sách vai trò')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllRoles = async (firstPage) => {
    const resolvedFirstPage =
      firstPage ??
      (await getRoles({
        page: 1,
        limit: ROLE_LOOKUP_PAGE_SIZE,
      }))

    const totalPages = Math.max(Number(resolvedFirstPage.totalPages || 0), 1)
    const resolvedPageSize = Math.max(Number(resolvedFirstPage.size || ROLE_LOOKUP_PAGE_SIZE), 1)
    const nextItems = [...(resolvedFirstPage.items || [])]

    for (let page = 2; page <= totalPages; page += 1) {
      const pageResult = await getRoles({
        page,
        limit: resolvedPageSize,
      })
      nextItems.push(...(pageResult.items || []))
    }

    setAllRoles(nextItems)
  }

  const fetchPermissions = async (page = permissionPage, resource = permissionCodeFilter, pageSize = permissionPageSize) => {
    const normalizedResource = String(resource || '')
      .trim()
      .toUpperCase()

    const result = await getPermissions({
      page,
      limit: pageSize,
      filters: { resource: normalizedResource || undefined },
    })
    setPermissions(result.items || [])
    setPermissionTotalPages(Number(result.totalPages || 0))
    setPermissionPage(Number(result.page || page))
    setPermissionTotalElements(Number(result.total ?? 0))
    setPermissionNumberOfElements(Number(result.items?.length ?? 0))
    const fallbackIsLast =
      Number(result.totalPages || 0) <= 1 ||
      Number(result.page || page) >= Number(result.totalPages || 0)
    setPermissionIsFirst(Number(result.page || page) <= 1)
    setPermissionIsLast(fallbackIsLast)
    return result
  }

  const handlePermissionPageChange = async (nextPage) => {
    const totalPages = Math.max(Number(permissionTotalPages || 0), 1)
    const normalizedPage = Math.min(Math.max(Number(nextPage) || 1, 1), totalPages)

    setLoading(true)
    clearNotice()
    try {
      await fetchPermissions(normalizedPage, permissionCodeFilter, permissionPageSize)
    } catch (err) {
      setError(err.message || 'Không tải được danh sách permission')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllAssignmentPermissions = async (firstPage) => {
    const resolvedFirstPage =
      firstPage ??
      (await getPermissions({
        page: 1,
        limit: ASSIGNMENT_PERMISSION_PAGE_SIZE,
      }))

    const totalPages = Math.max(Number(resolvedFirstPage.totalPages || 0), 1)
    const resolvedPageSize = Math.max(Number(resolvedFirstPage.size || ASSIGNMENT_PERMISSION_PAGE_SIZE), 1)
    const nextItems = [...(resolvedFirstPage.items || [])]

    for (let page = 2; page <= totalPages; page += 1) {
      const pageResult = await getPermissions({
        page,
        limit: resolvedPageSize,
      })
      nextItems.push(...(pageResult.items || []))
    }

    setAssignmentPermissions(nextItems)
  }

  const fetchUsers = async () => {
    const result = await getUsers({ page: 1, limit: USER_LOOKUP_SIZE })
    setUsers(result.items || [])
    return result
  }

  const fetchRolePermissions = async (roleId) => {
    if (!roleId) {
      setSelectedRolePermissionIds(new Set())
      return
    }
    const data = await getRolePermissions(roleId)
    setSelectedRolePermissionIds(new Set((data || []).map((item) => Number(item.id))))
  }

  const fetchUserRoles = async (userId) => {
    if (!userId) {
      setSelectedUserRoleIds(new Set())
      return
    }
    const data = await getUserRoles(userId)
    setSelectedUserRoleIds(new Set((data || []).map((item) => Number(item.id))))
  }

  useEffect(() => {
    if (hasLoadedInitialDataRef.current) {
      return
    }
    hasLoadedInitialDataRef.current = true

    const loadAll = async () => {
      setLoading(true)
      clearNotice()
      try {
        if (isPermissionsOnlyMode) {
          await fetchPermissions(1, '', permissionPageSize)
          return
        }

        if (isRolesOnlyMode) {
          await fetchRoles(1, '', rolePageSize)
          return
        }

        const [rolesPage, permissionsPage] = await Promise.all([
          fetchRoles(1, ''),
          fetchPermissions(1, ''),
        ])

        await Promise.all([
          fetchAllRoles(rolesPage),
          fetchAllAssignmentPermissions(permissionsPage),
          fetchUsers(),
        ])
      } catch (err) {
        setError(err.message || 'Không tải được dữ liệu RBAC')
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [isPermissionsOnlyMode, isRolesOnlyMode, permissionPageSize, rolePageSize])

  useEffect(() => {
    setAssignmentPermissionPage(1)
  }, [assignmentPermissionSearch])

  useEffect(() => {
    if (assignmentPermissionTotalPages === 0) {
      if (assignmentPermissionPage !== 1) {
        setAssignmentPermissionPage(1)
      }
      return
    }

    if (assignmentPermissionPage > assignmentPermissionTotalPages) {
      setAssignmentPermissionPage(assignmentPermissionTotalPages)
    }
  }, [assignmentPermissionPage, assignmentPermissionTotalPages])

  const handleCreateOrUpdateRole = async (e) => {
    e.preventDefault()
    clearNotice()

    if (!roleForm.name.trim()) {
      setError('Tên role không được để trống')
      return
    }

    setLoading(true)
    try {
      if (editingRoleId) {
        await updateRole(editingRoleId, {
          name: roleForm.name.trim(),
          description: roleForm.description.trim() || null,
        })
        setMessage('Cập nhật role thành công')
      } else {
        await createRole({
          name: roleForm.name.trim(),
          description: roleForm.description.trim() || null,
        })
        setMessage('Tạo role thành công')
      }

      setRoleForm(emptyRoleForm)
      setEditingRoleId(null)
      const refreshedRoles = await fetchRoles(rolePage, roleNameFilter, rolePageSize)
      if (isFullMode) {
        await fetchAllRoles(refreshedRoles)
      }
    } catch (err) {
      setError(err.message || 'Không thể lưu role')
    } finally {
      setLoading(false)
    }
  }

  const handleEditRole = (role) => {
    setEditingRoleId(Number(role.id))
    setRoleForm({
      name: role.name || '',
      description: role.description || '',
    })
    clearNotice()
  }

  const handleDeleteRole = async (roleId) => {
    const ok = await showConfirmDialog('Bạn chắc chắn muốn xóa vai trò này?', {
      title: 'Xác nhận xóa vai trò',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      danger: true,
    })
    if (!ok) return
    clearNotice()
    setLoading(true)
    try {
      await deleteRole(roleId)
      setMessage('Đã xóa role')
      if (selectedRoleId === Number(roleId)) {
        setSelectedRoleId(null)
        setSelectedRolePermissionIds(new Set())
      }
      const refreshedRoles = await fetchRoles(rolePage, roleNameFilter, rolePageSize)
      if (isFullMode) {
        await fetchAllRoles(refreshedRoles)
      }
    } catch (err) {
      setError(err.message || 'Không thể xóa role')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrUpdatePermission = async (e) => {
    e.preventDefault()
    clearNotice()

    const normalizedResource = String(permissionForm.resource || '')
      .trim()
      .toUpperCase()
    const normalizedAction = String(permissionForm.action || '')
      .trim()
      .toUpperCase()

    if (!normalizedResource) {
      setError('Resource không được để trống')
      return
    }

    if (!normalizedAction) {
      setError('Action không được để trống')
      return
    }

    const payload = {
      resource: normalizedResource,
      action: normalizedAction,
      description: permissionForm.description.trim() || null,
    }

    setLoading(true)
    try {
      if (editingPermissionId) {
        await updatePermission(editingPermissionId, payload)
        setMessage('Cập nhật permission thành công')
      } else {
        await createPermission(payload)
        setMessage('Tạo permission thành công')
      }

      setPermissionForm(emptyPermissionForm)
      setEditingPermissionId(null)
      const refreshedPermissions = await fetchPermissions(permissionPage, permissionCodeFilter, permissionPageSize)
      if (isFullMode) {
        await fetchAllAssignmentPermissions(refreshedPermissions)
      }
    } catch (err) {
      setError(err.message || 'Không thể lưu permission')
    } finally {
      setLoading(false)
    }
  }

  const handleEditPermission = (permission) => {
    setEditingPermissionId(Number(permission.id))
    setPermissionForm({
      resource: permission.resource || '',
      action: permission.action || '',
      description: permission.description || '',
    })
    clearNotice()
  }

  const handleDeletePermission = async (permissionId) => {
    const ok = await showConfirmDialog('Bạn chắc chắn muốn xóa quyền này?', {
      title: 'Xác nhận xóa quyền',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      danger: true,
    })
    if (!ok) return
    clearNotice()
    setLoading(true)
    try {
      await deletePermission(permissionId)
      setMessage('Đã xóa permission')
      if (selectedRolePermissionIds.has(Number(permissionId))) {
        const clone = new Set(selectedRolePermissionIds)
        clone.delete(Number(permissionId))
        setSelectedRolePermissionIds(clone)
      }
      const refreshedPermissions = await fetchPermissions(permissionPage, permissionCodeFilter, permissionPageSize)
      if (isFullMode) {
        await fetchAllAssignmentPermissions(refreshedPermissions)
      }
    } catch (err) {
      setError(err.message || 'Không thể xóa permission')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectRoleForPermissionMap = async (value) => {
    const roleId = Number(value) || null
    setSelectedRoleId(roleId)
    clearNotice()
    setLoading(true)
    try {
      await fetchRolePermissions(roleId)
    } catch (err) {
      setError(err.message || 'Không tải được quyền của role')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleSelectorInputChange = (value) => {
    setRoleSelectorInput(value)
    const normalized = String(value || '').trim().toLowerCase()
    if (!normalized) {
      setSelectedRoleId(null)
      setSelectedRolePermissionIds(new Set())
      return
    }

    const matched = roleSelectorOptions.find(
      (item) =>
        String(item.display).toLowerCase() === normalized ||
        String(item.label).toLowerCase() === normalized ||
        String(item.id) === normalized,
    )

    if (matched && selectedRoleId !== matched.id) {
      handleSelectRoleForPermissionMap(String(matched.id))
    }
  }

  const toggleRolePermissionSelection = (permissionId) => {
    const next = new Set(selectedRolePermissionIds)
    if (next.has(permissionId)) {
      next.delete(permissionId)
    } else {
      next.add(permissionId)
    }
    setSelectedRolePermissionIds(next)
  }

  const handleSelectAllFilteredPermissions = () => {
    const next = new Set(selectedRolePermissionIds)
    filteredAssignmentPermissions.forEach((item) => next.add(Number(item.id)))
    setSelectedRolePermissionIds(next)
  }

  const handleClearAllFilteredPermissions = () => {
    const next = new Set(selectedRolePermissionIds)
    filteredAssignmentPermissions.forEach((item) => next.delete(Number(item.id)))
    setSelectedRolePermissionIds(next)
  }

  const handleReplaceRolePermissions = async () => {
    if (!selectedRoleId) {
      setError('Hãy chọn role trước khi cập nhật permission')
      return
    }
    clearNotice()
    setLoading(true)
    try {
      await replaceRolePermissions(selectedRoleId, [...selectedRolePermissionIds])
      setMessage('Đã thay thế danh sách permission của role')
    } catch (err) {
      setError(err.message || 'Không thể cập nhật permission cho role')
    } finally {
      setLoading(false)
    }
  }

  const handleAddSelectedPermissions = async () => {
    if (!selectedRoleId) {
      setError('Hãy chọn role trước khi thêm permission')
      return
    }
    clearNotice()
    setLoading(true)
    try {
      await addPermissionsToRole(selectedRoleId, [...selectedRolePermissionIds])
      await fetchRolePermissions(selectedRoleId)
      setMessage('Đã thêm permission cho role')
    } catch (err) {
      setError(err.message || 'Không thể thêm permission cho role')
    } finally {
      setLoading(false)
    }
  }

  const handleRemovePermissionFromRole = async (permissionId) => {
    if (!selectedRoleId) return
    const ok = await showConfirmDialog(`Bạn chắc chắn muốn gỡ quyền #${permissionId} khỏi vai trò đã chọn?`, {
      title: 'Xác nhận gỡ quyền',
      confirmText: 'Gỡ quyền',
      cancelText: 'Hủy',
      danger: true,
    })
    if (!ok) return
    clearNotice()
    setLoading(true)
    try {
      await removePermissionFromRole(selectedRoleId, permissionId)
      await fetchRolePermissions(selectedRoleId)
      setMessage('Đã gỡ permission khỏi role')
    } catch (err) {
      setError(err.message || 'Không thể gỡ permission khỏi role')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectUser = async (value) => {
    const userId = Number(value) || null
    setSelectedUserId(userId)
    clearNotice()
    setLoading(true)
    try {
      await fetchUserRoles(userId)
    } catch (err) {
      setError(err.message || 'Không tải được role của user')
    } finally {
      setLoading(false)
    }
  }

  const handleUserSelectorInputChange = (value) => {
    setUserSelectorInput(value)
    const normalized = String(value || '').trim().toLowerCase()
    if (!normalized) {
      setSelectedUserId(null)
      setSelectedUserRoleIds(new Set())
      return
    }

    const matched = userSelectorOptions.find(
      (item) =>
        String(item.display).toLowerCase() === normalized ||
        String(item.label).toLowerCase() === normalized ||
        String(item.id) === normalized,
    )

    if (matched && selectedUserId !== matched.id) {
      handleSelectUser(String(matched.id))
    }
  }

  const toggleUserRole = (roleId) => {
    const next = new Set(selectedUserRoleIds)
    if (next.has(roleId)) {
      next.delete(roleId)
    } else {
      next.add(roleId)
    }
    setSelectedUserRoleIds(next)
  }

  const handleSelectAllFilteredRoles = () => {
    const next = new Set(selectedUserRoleIds)
    filteredAssignmentRoles.forEach((item) => next.add(Number(item.id)))
    setSelectedUserRoleIds(next)
  }

  const handleClearAllFilteredRoles = () => {
    const next = new Set(selectedUserRoleIds)
    filteredAssignmentRoles.forEach((item) => next.delete(Number(item.id)))
    setSelectedUserRoleIds(next)
  }

  const handleReplaceUserRoles = async () => {
    if (!selectedUserId) {
      setError('Hãy chọn user trước khi cập nhật role')
      return
    }

    clearNotice()
    setLoading(true)
    try {
      await replaceUserRoles(selectedUserId, [...selectedUserRoleIds])
      await fetchUserRoles(selectedUserId)
      setMessage('Cập nhật role cho user thành công')
    } catch (err) {
      setError(err.message || 'Không thể cập nhật role của user')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedRoleId) {
      setRoleSelectorInput('')
      return
    }
    const selected = roleSelectorOptions.find((item) => item.id === Number(selectedRoleId))
    if (selected) {
      setRoleSelectorInput(selected.display)
    }
  }, [selectedRoleId, roleSelectorOptions])

  useEffect(() => {
    if (!selectedUserId) {
      setUserSelectorInput('')
      return
    }
    const selected = userSelectorOptions.find((item) => item.id === Number(selectedUserId))
    if (selected) {
      setUserSelectorInput(selected.display)
    }
  }, [selectedUserId, userSelectorOptions])

  return {
    loading,
    error,
    message,

    roleNameFilter,
    setRoleNameFilter,
    rolePage,
    rolePageSize,
    setRolePageSize,
    roleTotalPages,
    roleTotalElements,
    roleNumberOfElements,
    roleIsFirst,
    roleIsLast,
    roles,
    allRoles,
    roleForm,
    setRoleForm,
    editingRoleId,
    setEditingRoleId,

    permissionCodeFilter,
    setPermissionCodeFilter,
    permissionPage,
    setPermissionPage,
    permissionPageSize,
    setPermissionPageSize,
    permissionTotalPages,
    permissionTotalElements,
    permissionNumberOfElements,
    permissionIsFirst,
    permissionIsLast,
    permissions,
    assignmentPermissions,
    assignmentPermissionPage,
    setAssignmentPermissionPage: clampAssignmentPermissionPage,
    assignmentPermissionPageSize,
    setAssignmentPermissionPageSize,
    assignmentPermissionTotalPages,
    assignmentPermissionIsFirst,
    assignmentPermissionIsLast,
    paginatedAssignmentPermissions,
    permissionForm,
    setPermissionForm,
    editingPermissionId,
    setEditingPermissionId,

    selectedRoleId,
    selectedRolePermissionIds,

    selectedUserId,
    selectedUserRoleIds,
    roleSelectorInput,
    userSelectorInput,
    assignmentPermissionSearch,
    setAssignmentPermissionSearch,
    assignmentRoleSearch,
    setAssignmentRoleSearch,

    filteredAssignmentPermissions,
    filteredRoleSelectorOptions,
    filteredUsers,
    filteredAssignmentRoles,

    clearNotice,
    fetchRoles,
    fetchPermissions,
    handleRolePageChange,
    handlePermissionPageChange,
    handleCreateOrUpdateRole,
    handleEditRole,
    handleDeleteRole,
    handleCreateOrUpdatePermission,
    handleEditPermission,
    handleDeletePermission,
    handleRoleSelectorInputChange,
    toggleRolePermissionSelection,
    handleSelectAllFilteredPermissions,
    handleClearAllFilteredPermissions,
    handleReplaceRolePermissions,
    handleAddSelectedPermissions,
    handleRemovePermissionFromRole,
    handleUserSelectorInputChange,
    toggleUserRole,
    handleSelectAllFilteredRoles,
    handleClearAllFilteredRoles,
    handleReplaceUserRoles,
  }
}
