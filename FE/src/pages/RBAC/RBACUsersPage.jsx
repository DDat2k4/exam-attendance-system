import { useCallback, useEffect, useState } from 'react'
import { createUser, deleteUser, getUsers, updateUser } from '../../api/userApi'
import { getRoles } from '../../api/roleApi'
import { replaceUserRoles } from '../../api/userRoleApi'
import UsersSection from '../../components/RBAC/UsersSection'
import { showConfirmDialog } from '../../utils/confirmDialog'
import '../../components/RBAC/RBAC.css'

const emptyUserForm = {
  username: '',
  email: '',
  phone: '',
  password: '',
  active: true,
}

const DEFAULT_PAGE_SIZE = 10
const ROLE_LOOKUP_SIZE = 50

export default function RBACUsersPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])

  const [keyword, setKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [isFirst, setIsFirst] = useState(true)
  const [isLast, setIsLast] = useState(true)

  const [userForm, setUserForm] = useState(emptyUserForm)
  const [editingUserId, setEditingUserId] = useState(null)
  const [selectedRoleIds, setSelectedRoleIds] = useState([])

  const clearNotice = () => {
    setError('')
    setMessage('')
  }

  const fetchUsers = useCallback(async (nextPage = page, nextRoleFilter = roleFilter, nextPageSize = pageSize) => {
    setLoading(true)
    try {
      const result = await getUsers({
        page: nextPage,
        limit: nextPageSize,
        role: nextRoleFilter || undefined,
      })

      const safePage = Number(result.page || nextPage || 1)
      const safeTotalPages = Number(result.totalPages || 0)
      const fallbackIsLast = safeTotalPages <= 1 || safePage >= safeTotalPages

      setUsers(result.items || [])
      setPage(safePage)
      setPageSize(Number(result.size || nextPageSize || DEFAULT_PAGE_SIZE))
      setTotalPages(safeTotalPages)
      setTotalElements(Number(result.total || 0))
      setIsFirst(safePage <= 1)
      setIsLast(fallbackIsLast)
    } catch (err) {
      setError(err.message || 'Không tải được danh sách user')
    } finally {
      setLoading(false)
    }
  }, [page, roleFilter, pageSize])

  const fetchRoles = useCallback(async () => {
    try {
      const result = await getRoles({ page: 1, limit: ROLE_LOOKUP_SIZE })
      setRoles(result.items || [])
    } catch (err) {
      setError(err.message || 'Không tải được danh sách role')
    }
  }, [])

  useEffect(() => {
    fetchUsers(1)
    fetchRoles()
  }, [fetchUsers, fetchRoles])

  const handleCreateOrUpdateUser = async () => {
    clearNotice()

    if (!editingUserId && !String(userForm.password || '').trim()) {
      setError('Mật khẩu không được để trống khi tạo mới user')
      return false
    }

    setLoading(true)
    try {
      if (editingUserId) {
        await updateUser(editingUserId, {
          email: userForm.email.trim(),
          password: userForm.password.trim() || undefined,
          active: Boolean(userForm.active),
        })

        await replaceUserRoles(editingUserId, selectedRoleIds)
        setMessage('Cập nhật user thành công')
      } else {
        const createdUserId = await createUser({
          username: userForm.username.trim(),
          email: userForm.email.trim(),
          phone: userForm.phone.trim() || undefined,
          password: userForm.password.trim(),
        })

        const safeCreatedUserId = Number(createdUserId)
        if (safeCreatedUserId && selectedRoleIds.length > 0) {
          await replaceUserRoles(safeCreatedUserId, selectedRoleIds)
        }

        setMessage('Tạo user thành công')
      }

      setUserForm(emptyUserForm)
      setEditingUserId(null)
      setSelectedRoleIds([])
      await fetchUsers(page, roleFilter, pageSize)
      return true
    } catch (err) {
      setError(err.message || 'Không thể lưu user')
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId) => {
    const ok = await showConfirmDialog('Bạn chắc chắn muốn xóa người dùng này?', {
      title: 'Xác nhận xóa người dùng',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      danger: true,
    })
    if (!ok) return

    clearNotice()
    setLoading(true)
    try {
      await deleteUser(userId)
      setMessage('Đã xóa user')
      await fetchUsers(page, roleFilter, pageSize)
    } catch (err) {
      setError(err.message || 'Không thể xóa user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rbac-page">
      <div className="rbac-head">
        <h2>Quản Lý Người Dùng</h2>
        <p>Tạo, cập nhật, lọc theo vai trò và quản lý vòng đời tài khoản người dùng.</p>
      </div>

      {message && <p className="status-line success">{message}</p>}
      {error && <p className="status-line error">{error}</p>}

      <UsersSection
        users={users}
        loading={loading}
        keyword={keyword}
        setKeyword={setKeyword}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        roleOptions={roles}
        fetchUsers={fetchUsers}
        page={page}
        totalPages={totalPages}
        isFirst={isFirst}
        isLast={isLast}
        pageSize={pageSize}
        setPageSize={setPageSize}
        totalElements={totalElements}
        userForm={userForm}
        setUserForm={setUserForm}
        editingUserId={editingUserId}
        setEditingUserId={setEditingUserId}
        selectedRoleIds={selectedRoleIds}
        setSelectedRoleIds={setSelectedRoleIds}
        handleCreateOrUpdateUser={handleCreateOrUpdateUser}
        handleDeleteUser={handleDeleteUser}
      />
    </div>
  )
}
