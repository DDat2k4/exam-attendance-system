export const normalizeSessionStatus = (status) => String(status || '').toUpperCase()

export const APPROVED_SESSION_STATUSES = new Set(['CHECKED_IN', 'IN_PROGRESS'])

export const isApprovedSessionStatus = (status) =>
  APPROVED_SESSION_STATUSES.has(normalizeSessionStatus(status))

export const SESSION_STATUS_LABELS = {
  INIT: 'Khởi tạo',
  NOT_STARTED: 'Chưa bắt đầu',
  CHECKED_IN: 'Đã điểm danh',
  IN_PROGRESS: 'Đang diễn ra',
  DONE: 'Hoàn thành',
  BLOCKED: 'Bị chặn',
  PENDING_REVIEW: 'Chờ giám thị duyệt',
  PENDING_DEVICE_APPROVAL: 'Chờ phê duyệt thiết bị',
  PENDING_VERIFY_REVIEW: 'Chờ duyệt xác minh',
}

export const getSessionStatusLabel = (status) => {
  const key = normalizeSessionStatus(status)
  return SESSION_STATUS_LABELS[key] || (status || '')
}

export const statusToBadgeClass = (status) => {
  const key = normalizeSessionStatus(status) || ''
  return key.toLowerCase()
}
