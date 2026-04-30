import React from 'react'

export default function AssignmentsSection({
  roleSelectorInput,
  handleRoleSelectorInputChange,
  filteredRoleSelectorOptions,
  selectedRolePermissionIds,
  assignmentPermissionSearch,
  setAssignmentPermissionSearch,
  assignmentPermissionPage,
  setAssignmentPermissionPage,
  handleSelectAllFilteredPermissions,
  handleClearAllFilteredPermissions,
  filteredAssignmentPermissions,
  paginatedAssignmentPermissions,
  assignmentPermissionTotalPages,
  assignmentPermissionIsFirst,
  assignmentPermissionIsLast,
  toggleRolePermissionSelection,
  selectedRoleId,
  handleReplaceRolePermissions,
}) {
  // Group permissions by resource
  const groupedPermissions = React.useMemo(() => {
    const groups = new Map()
    paginatedAssignmentPermissions.forEach((permission) => {
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
  }, [paginatedAssignmentPermissions])

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

  const isAllSelectedRoles = filteredAssignmentPermissions.length > 0 && filteredAssignmentPermissions.every((p) =>
    selectedRolePermissionIds.has(Number(p.id))
  )

  const handleRoleClick = (role) => {
    const roleDisplay = role.display || `${role.id} - ${role.label}`
    handleRoleSelectorInputChange(roleDisplay)
  }

  const totalAssignedPermissions = selectedRolePermissionIds.size
  const totalPermissions = filteredAssignmentPermissions?.length || 0

  return (
    <section className="assignments-container">
      <div className="assignments-grid">
        {/* Cột trái: Vai trò */}
        <article className="assignment-card">
          <div className="assignment-header">
            <h3>Vai trò</h3>
            <button type="button" className="btn-reload" onClick={() => handleRoleSelectorInputChange('')}>
              Tải lại
            </button>
          </div>

          <div className="assignment-search">
            <input
              type="text"
              value={roleSelectorInput}
              onChange={(e) => handleRoleSelectorInputChange(e.target.value)}
              placeholder="Tìm vai trò..."
            />
          </div>

          <div className="roles-list">
            {filteredRoleSelectorOptions.length === 0 ? (
              <p className="empty-state">Không có role</p>
            ) : (
              filteredRoleSelectorOptions.map((role) => (
                <div
                  key={role.id}
                  className={`role-item ${selectedRoleId === role.id ? 'active' : ''}`}
                  onClick={() => handleRoleClick(role)}
                >
                  <strong>{role.label}</strong>
                  <p>ID: {role.id}</p>
                </div>
              ))
            )}
          </div>
        </article>

        {/* Cột phải: Quyền */}
        <article className="assignment-card">
          <div className="assignment-header">
            <h3>Quyền</h3>
            <span className="assignment-badge">
              Đã gán: {totalAssignedPermissions} / {totalPermissions}
            </span>
          </div>

          <div className="assignment-search">
            <input
              type="text"
              value={assignmentPermissionSearch}
              onChange={(e) => {
                setAssignmentPermissionSearch(e.target.value)
                setAssignmentPermissionPage(1)
              }}
              placeholder="Tìm quyền (mã/mô tả)..."
            />
          </div>

          <div className="assignment-controls">
            <button
              type="button"
              className="btn-control"
              onClick={handleSelectAllFilteredPermissions}
              disabled={!selectedRoleId || filteredAssignmentPermissions.length === 0}
            >
              Chọn tất cả
            </button>
            <button
              type="button"
              className="btn-control"
              onClick={handleClearAllFilteredPermissions}
              disabled={!selectedRoleId || selectedRolePermissionIds.size === 0}
            >
              Bỏ chọn tất cả
            </button>
          </div>

          <div className="permissions-table-wrap">
            <table className="permissions-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th style={{ width: '50px' }}>
                    <input
                      type="checkbox"
                      checked={isAllSelectedRoles}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleSelectAllFilteredPermissions()
                        } else {
                          handleClearAllFilteredPermissions()
                        }
                      }}
                      disabled={!selectedRoleId}
                    />
                  </th>
                  <th>Resource</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedPermissions.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                      {selectedRoleId ? 'Không có permission' : 'Vui lòng chọn role'}
                    </td>
                  </tr>
                ) : (
                  groupedPermissions.map((group, idx) => {
                    const allChecked = group.permissions.every((p) => selectedRolePermissionIds.has(Number(p.id)))
                    const someChecked = group.permissions.some((p) => selectedRolePermissionIds.has(Number(p.id)))
                    return (
                    <tr key={group.resource}>
                      <td>{idx + 1}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={allChecked}
                          ref={(el) => {
                            if (el) el.indeterminate = someChecked && !allChecked
                          }}
                          onChange={(e) => {
                            group.permissions.forEach((p) => {
                              const isSelected = selectedRolePermissionIds.has(Number(p.id))
                              if (e.target.checked && !isSelected) {
                                toggleRolePermissionSelection(Number(p.id))
                              } else if (!e.target.checked && isSelected) {
                                toggleRolePermissionSelection(Number(p.id))
                              }
                            })
                          }}
                        />
                      </td>
                      <td style={{ fontWeight: '600' }}>{group.resource}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {group.actions.map((item) => {
                            const colors = getActionColor(item.action)
                            const isSelected = selectedRolePermissionIds.has(Number(item.id))
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => toggleRolePermissionSelection(Number(item.id))}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '6px 12px',
                                  borderRadius: '999px',
                                  background: isSelected ? colors.bg : 'rgba(255,255,255,0.1)',
                                  border: `2px solid ${isSelected ? colors.border : 'rgba(255,255,255,0.2)'}`,
                                  color: isSelected ? colors.text : '#999',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.borderColor = colors.border
                                    e.currentTarget.style.color = colors.text
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                                    e.currentTarget.style.color = '#999'
                                  }
                                }}
                                title={`${item.code} · ${item.description}`}
                              >
                                {isSelected ? '✓' : ''} {item.action}
                              </button>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="assignment-pagination">
            <button
              type="button"
              disabled={assignmentPermissionIsFirst || assignmentPermissionTotalPages === 0}
              onClick={() => setAssignmentPermissionPage(1)}
            >
              Đầu
            </button>
            <button
              type="button"
              disabled={assignmentPermissionIsFirst || assignmentPermissionTotalPages === 0}
              onClick={() => setAssignmentPermissionPage(assignmentPermissionPage - 1)}
            >
              Trước
            </button>
            <span className="page-info">
              {assignmentPermissionPage}/{Math.max(assignmentPermissionTotalPages, 1)}
            </span>
            <button
              type="button"
              disabled={assignmentPermissionIsLast || assignmentPermissionTotalPages === 0}
              onClick={() => setAssignmentPermissionPage(assignmentPermissionPage + 1)}
            >
              Sau
            </button>
            <button
              type="button"
              disabled={assignmentPermissionIsLast || assignmentPermissionTotalPages === 0}
              onClick={() => setAssignmentPermissionPage(assignmentPermissionTotalPages)}
            >
              Cuối
            </button>
          </div>

          <div className="assignment-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={handleReplaceRolePermissions}
              disabled={!selectedRoleId}
            >
              Cập nhật quyền
            </button>
          </div>
        </article>
      </div>
    </section>
  )
}
