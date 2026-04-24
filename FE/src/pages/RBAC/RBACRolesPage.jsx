import RolesSection from '../../components/RBAC/RolesSection'
import useRbacManagement from '../../hooks/useRbacManagement'
import '../../components/RBAC/RBAC.css'

export default function RBACRolesPage() {
  const rbac = useRbacManagement()

  return (
    <div className="rbac-page">
      <div className="rbac-head">
        <h2>Quản lý vai trò</h2>
        <p>Tạo, cập nhật và quản lý danh sách vai trò cho hệ thống.</p>
      </div>

      {rbac.loading && <p className="status-line">Đang xử lý...</p>}
      {rbac.message && <p className="status-line success">{rbac.message}</p>}
      {rbac.error && <p className="status-line error">{rbac.error}</p>}

      <RolesSection
        roleForm={rbac.roleForm}
        setRoleForm={rbac.setRoleForm}
        editingRoleId={rbac.editingRoleId}
        setEditingRoleId={rbac.setEditingRoleId}
        handleCreateOrUpdateRole={rbac.handleCreateOrUpdateRole}
        roleNameFilter={rbac.roleNameFilter}
        setRoleNameFilter={rbac.setRoleNameFilter}
        rolePageSize={rbac.rolePageSize}
        allRoles={rbac.allRoles}
        handleEditRole={rbac.handleEditRole}
        handleDeleteRole={rbac.handleDeleteRole}
      />
    </div>
  )
}
