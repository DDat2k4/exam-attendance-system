import PermissionsSection from '../../components/RBAC/PermissionsSection'
import useRbacManagement from '../../hooks/useRbacManagement'
import '../../components/RBAC/RBAC.css'

export default function RBACPermissionsPage() {
  const rbac = useRbacManagement()

  return (
    <div className="rbac-page">
      <div className="rbac-head">
        <h2>Quản lý quyền</h2>
        <p>Tạo, cập nhật và quản lý danh sách quyền cho hệ thống.</p>
      </div>

      {rbac.loading && <p className="status-line">Đang xử lý...</p>}
      {rbac.message && <p className="status-line success">{rbac.message}</p>}
      {rbac.error && <p className="status-line error">{rbac.error}</p>}

      <PermissionsSection
        permissionForm={rbac.permissionForm}
        setPermissionForm={rbac.setPermissionForm}
        editingPermissionId={rbac.editingPermissionId}
        setEditingPermissionId={rbac.setEditingPermissionId}
        handleCreateOrUpdatePermission={rbac.handleCreateOrUpdatePermission}
        permissionCodeFilter={rbac.permissionCodeFilter}
        setPermissionCodeFilter={rbac.setPermissionCodeFilter}
        permissionPageSize={rbac.permissionPageSize}
        assignmentPermissions={rbac.assignmentPermissions}
        handleEditPermission={rbac.handleEditPermission}
        handleDeletePermission={rbac.handleDeletePermission}
      />
    </div>
  )
}
