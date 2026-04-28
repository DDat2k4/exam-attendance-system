import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_PAGE_SIZE } from '../../hooks/useRbacManagement'
import FormModal from './FormModal'

const emptyPermissionForm = { resource: '', action: '', description: '' }

export default function PermissionsSection({
  permissionForm,
  setPermissionForm,
  editingPermissionId,
  setEditingPermissionId,
  handleCreateOrUpdatePermission,
  permissionCodeFilter,
  setPermissionCodeFilter,
  permissionPageSize,
  assignmentPermissions,
  handleEditPermission,
  handleDeletePermission,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [localPermissionPage, setLocalPermissionPage] = useState(1)

  const filteredPermissions = useMemo(() => {
    const keyword = String(permissionCodeFilter || '')
      .trim()
      .toLowerCase()

    if (!keyword) {
      return assignmentPermissions
    }

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
  }, [assignmentPermissions, permissionCodeFilter])

  const groupedPermissions = useMemo(() => {
    const groups = new Map()

    filteredPermissions.forEach((permission) => {
      const resource = String(permission?.resource || 'UNKNOWN').trim() || 'UNKNOWN'
      const current = groups.get(resource) || {
        resource,
        permissions: [],
        actions: [],
      }

      current.permissions.push(permission)
      current.actions.push({
        id: permission.id,
        action: permission.action || '-',
        code: permission.code || '-',
        description: permission.description || '-',
      })
      groups.set(resource, current)
    })

    return Array.from(groups.values())
  }, [filteredPermissions])

  const normalizedPageSize = Number(permissionPageSize) > 0 ? Number(permissionPageSize) : DEFAULT_PAGE_SIZE

  const localTotalPages = useMemo(() => {
    if (groupedPermissions.length === 0) return 0
    return Math.ceil(groupedPermissions.length / normalizedPageSize)
  }, [groupedPermissions.length, normalizedPageSize])

  const paginatedPermissions = useMemo(() => {
    if (groupedPermissions.length === 0) return []
    const startIndex = (localPermissionPage - 1) * normalizedPageSize
    return groupedPermissions.slice(startIndex, startIndex + normalizedPageSize)
  }, [groupedPermissions, localPermissionPage, normalizedPageSize])

  const localIsFirst = localPermissionPage <= 1
  const localIsLast = localTotalPages === 0 || localPermissionPage >= localTotalPages

  useEffect(() => {
    setLocalPermissionPage(1)
  }, [permissionCodeFilter])

  useEffect(() => {
    if (localTotalPages === 0) {
      if (localPermissionPage !== 1) {
        setLocalPermissionPage(1)
      }
      return
    }

    if (localPermissionPage > localTotalPages) {
      setLocalPermissionPage(localTotalPages)
    }
  }, [localPermissionPage, localTotalPages])

  const handleOpenModal = () => {
    setPermissionForm(emptyPermissionForm)
    setEditingPermissionId(null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setPermissionForm(emptyPermissionForm)
    setEditingPermissionId(null)
  }

  const handleSubmitForm = (e) => {
    e.preventDefault()
    handleCreateOrUpdatePermission(e)
    handleCloseModal()
  }

  const getActionColor = (action) => {
    const colors = {
      READ: { bg: '#4caf50', border: '#2e7d32', text: '#fff' },
      CREATE: { bg: '#2196f3', border: '#1565c0', text: '#fff' },
      UPDATE: { bg: '#ff9800', border: '#e65100', text: '#fff' },
      DELETE: { bg: '#f44336', border: '#c62828', text: '#fff' },
      VERIFY: { bg: '#9c27b0', border: '#6a1b9a', text: '#fff' },
      CHECKIN: { bg: '#e91e63', border: '#880e4f', text: '#fff' },
      EXPORT: { bg: '#3f51b5', border: '#283593', text: '#fff' },
    }
    return colors[action] || { bg: '#757575', border: '#424242', text: '#fff' }
  }

  const handleEditClick = (permission) => {
    handleEditPermission(permission)
    setIsModalOpen(true)
  }

  return (
    <section className="rbac-minimal">
      <div className="rbac-header">
        <div className="search-bar">
          <input
            value={permissionCodeFilter}
            onChange={(e) => setPermissionCodeFilter(e.target.value)}
            placeholder="Tìm kiếm theo mã permission..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setLocalPermissionPage(1)
              }
            }}
          />
          <button type="button" onClick={() => setLocalPermissionPage(1)} className="btn-search">
            🔍
          </button>
        </div>
        <button type="button" className="btn-new" onClick={handleOpenModal}>
          + TẠO QUYỀN
        </button>
      </div>

      <FormModal
        isOpen={isModalOpen}
        title={editingPermissionId ? 'Chỉnh sửa quyền' : 'Tạo quyền mới'}
        onClose={handleCloseModal}
        onSubmit={handleSubmitForm}
      >
        <label>Resource</label>
        <input
          value={permissionForm.resource}
          onChange={(e) => setPermissionForm((prev) => ({ ...prev, resource: e.target.value.toUpperCase() }))}
          placeholder="VD: PERMISSION"
          required
        />
        <label>Action</label>
        <input
          value={permissionForm.action}
          onChange={(e) => setPermissionForm((prev) => ({ ...prev, action: e.target.value.toUpperCase() }))}
          placeholder="VD: READ"
          required
        />
        <label>Mô tả</label>
        <input
          value={permissionForm.description}
          onChange={(e) => setPermissionForm((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Mô tả chi tiết về quyền"
        />
      </FormModal>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Resource</th>
              <th>Actions</th>
              <th>Số quyền</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPermissions.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                  Không có quyền phù hợp
                </td>
              </tr>
            ) : (
              paginatedPermissions.map((group, idx) => (
                <tr key={group.resource}>
                  <td>{(localPermissionPage - 1) * normalizedPageSize + idx + 1}</td>
                  <td>{group.resource}</td>
                  <td>
                    <div className="action-buttons" style={{ flexWrap: 'wrap', gap: '6px' }}>
                      {group.actions.map((item) => {
                        const colors = getActionColor(item.action)
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              const perm = group.permissions.find((p) => p.id === item.id)
                              if (perm) handleEditClick(perm)
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 14px',
                              borderRadius: '999px',
                              background: colors.bg,
                              border: `2px solid ${colors.border}`,
                              color: colors.text,
                              fontSize: '13px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.08)'
                              e.currentTarget.style.boxShadow = `0 4px 12px ${colors.bg}80`
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)'
                              e.currentTarget.style.boxShadow = 'none'
                            }}
                            title={`${item.code} · ${item.description}`}
                          >
                            {item.action}
                          </button>
                        )
                      })}
                    </div>
                  </td>
                  <td>{group.actions.length}</td>
                  <td>
                    <div className="action-buttons">
                      <button type="button" className="btn-edit" onClick={() => setIsModalOpen(true)}>
                        + Thêm
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button type="button" disabled={localIsFirst || localTotalPages === 0} onClick={() => setLocalPermissionPage(1)}>
          Đầu
        </button>
        <button
          type="button"
          disabled={localIsFirst || localTotalPages === 0}
          onClick={() => setLocalPermissionPage((prev) => Math.max(prev - 1, 1))}
        >
          Trước
        </button>
        <span className="page-info">
          {localPermissionPage}/{Math.max(localTotalPages, 1)}
        </span>
        <button
          type="button"
          disabled={localIsLast || localTotalPages === 0}
          onClick={() => setLocalPermissionPage((prev) => Math.min(prev + 1, Math.max(localTotalPages, 1)))}
        >
          Sau
        </button>
        <button
          type="button"
          disabled={localIsLast || localTotalPages === 0}
          onClick={() => setLocalPermissionPage(Math.max(localTotalPages, 1))}
        >
          Cuối
        </button>
      </div>
    </section>
  )
}
