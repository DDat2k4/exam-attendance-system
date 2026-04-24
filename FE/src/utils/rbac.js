const normalizeCode = (value) => String(value || '').trim().toUpperCase()

const toCodeList = (items) => {
  if (!Array.isArray(items)) return []

  return items
    .map((item) => {
      if (typeof item === 'string') return normalizeCode(item)
      if (item && typeof item === 'object') {
        return normalizeCode(item.code || item.name || item.permission || item.role)
      }
      return ''
    })
    .filter(Boolean)
}

export const getRoleCodes = (user) => toCodeList(user?.roles)
export const getPermissionCodes = (user) => toCodeList(user?.permissions)

export const hasRole = (user, role) => {
  if (!role) return false
  const roles = getRoleCodes(user)
  return roles.includes(normalizeCode(role))
}

export const hasAnyRole = (user, requiredRoles = []) => {
  if (!requiredRoles.length) return true
  const roleSet = new Set(getRoleCodes(user))
  return requiredRoles.some((role) => roleSet.has(normalizeCode(role)))
}

export const hasPermission = (user, permission) => {
  if (!permission) return false
  const permissions = getPermissionCodes(user)
  return permissions.includes(normalizeCode(permission))
}

export const hasAnyPermission = (user, requiredPermissions = []) => {
  if (!requiredPermissions.length) return true
  const permissionSet = new Set(getPermissionCodes(user))
  return requiredPermissions.some((permission) => permissionSet.has(normalizeCode(permission)))
}

export const canAccess = (user, rules = {}) => {
  if (!user) return false

  const roleOk = hasAnyRole(user, rules.allowRoles || [])
  const permissionOk = hasAnyPermission(user, rules.allowPermissions || [])

  if (rules.match === 'all') {
    return roleOk && permissionOk
  }

  if ((rules.allowRoles || []).length && (rules.allowPermissions || []).length) {
    return roleOk || permissionOk
  }

  return roleOk && permissionOk
}
