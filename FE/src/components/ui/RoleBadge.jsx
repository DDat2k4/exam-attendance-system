import { getRoleCodes } from '../../utils/rbac'

export default function RoleBadge({ user }) {
  const role = getRoleCodes(user)[0] || 'GUEST'

  return <span className={`role-badge role-${role.toLowerCase()}`}>{role}</span>
}
