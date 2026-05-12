import { ChevronLeftIcon, ChevronRightIcon, RefreshIcon, TrashIcon } from '../ui/AppIcons'

export default function RegistrationsSection({
  handleBatchRegister,
  registrationForm,
  onRegistrationChange,
  examOptions,
  registrationUserQuery,
  setRegistrationUserQuery,
  registrationUserRole,
  setRegistrationUserRole,
  toggleSelectAllFilteredUsers,
  loadingRegistrationUsers,
  filteredRegistrationUsers,
  fetchRegistrationUsers,
  selectedRegistrationUserIds,
  toggleRegistrationUser,
  submittingRegistration,
  fetchRegistrations,
  registrationPage,
  loadingRegistrations,
  registrationRows,
  registrationUsers = [],
  formatDateTime,
  handleRemoveRegistration,
  processingRegistrationId,
  registrationTotalPages,
}) {
  const findExamLabel = (examId) => {
    try {
      const found = examOptions.find((o) => Number(o.id) === Number(examId))
      return found?.label || examId || '-'
    } catch (e) {
      return examId || '-'
    }
  }

  const findUserLabel = (userId) => {
    try {
      const found = (registrationUsers || []).find((u) => Number(u?.id) === Number(userId))
      return found?.name || found?.username || userId || '-'
    } catch (e) {
      return userId || '-'
    }
  }

  const REG_STATUS = {
    0: 'Chờ',
    1: 'Đã đăng ký',
    2: 'Đã hủy',
  }

  const renderStatus = (s) => {
    if (s === null || s === undefined) return '-'
    if (typeof s === 'string') return s
    return REG_STATUS[s] ?? String(s)
  }

  return (
    <section className="panel">
      <h2>Đăng ký danh sách thí sinh</h2>
      <form className="grid-form" onSubmit={handleBatchRegister}>
        <label htmlFor="registrationExamId">Kỳ thi</label>
        <select
          id="registrationExamId"
          name="examId"
          value={registrationForm.examId}
          onChange={onRegistrationChange}
        >
          <option value="">Chọn kỳ thi</option>
          {examOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>

        <label htmlFor="registrationUserSearch">Danh sách sinh viên</label>
        <div className="registration-user-picker">
          <div className="registration-user-head">
            <input
              id="registrationUserSearch"
              value={registrationUserQuery}
              onChange={(e) => setRegistrationUserQuery(e.target.value)}
              placeholder="Tìm theo ID, email hoặc tài khoản"
            />
            <select
              value={registrationUserRole}
              onChange={(e) => setRegistrationUserRole(e.target.value)}
              title="Lọc theo role"
            >
              <option value="ALL">Tất cả role</option>
              <option value="STUDENT">STUDENT</option>
              <option value="PROCTOR">PROCTOR</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <button
              type="button"
              className="tiny-btn"
              onClick={toggleSelectAllFilteredUsers}
              disabled={loadingRegistrationUsers || filteredRegistrationUsers.length === 0}
            >
              Chọn/Bỏ tất cả
            </button>
            <button
              type="button"
              className="tiny-btn"
              onClick={() => fetchRegistrationUsers(registrationUserRole)}
              disabled={loadingRegistrationUsers}
            >
              <RefreshIcon size={14} />
              {loadingRegistrationUsers ? 'Đang tải...' : 'Tải sinh viên'}
            </button>
          </div>

          <div className="registration-user-list">
            {loadingRegistrationUsers ? (
              <p>Đang tải danh sách sinh viên...</p>
            ) : filteredRegistrationUsers.length === 0 ? (
              <p>Không có sinh viên phù hợp.</p>
            ) : (
              filteredRegistrationUsers.map((u) => {
                const uid = Number(u?.id)
                const isChecked = selectedRegistrationUserIds.includes(uid)
                const displayName = u?.name || u?.username || '-'
                return (
                  <label key={u?.id ?? `${displayName}-${u?.email}`} className="registration-user-item">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleRegistrationUser(uid)}
                    />
                    <span>{displayName} | {u?.email || '-'}</span>
                  </label>
                )
              })
            )}
          </div>

          <small>
            Đã chọn {selectedRegistrationUserIds.length} sinh viên
            {selectedRegistrationUserIds.length > 0 ? `: ${selectedRegistrationUserIds.join(', ')}` : ''}
          </small>
        </div>

        <button className="primary" type="submit" disabled={submittingRegistration || selectedRegistrationUserIds.length === 0}>
          {submittingRegistration ? 'Đang đăng ký...' : 'Đăng ký danh sách'}
        </button>
      </form>

      <div className="registration-list">
        <div className="session-head">
          <h3>Danh sách đã đăng ký</h3>
          <button
            type="button"
            className="tiny-btn"
            onClick={() => fetchRegistrations(registrationForm.examId, registrationPage)}
            disabled={!registrationForm.examId || loadingRegistrations}
          >
            <RefreshIcon size={14} />
            {loadingRegistrations ? 'Đang tải...' : 'Tải lại'}
          </button>
        </div>

        {!registrationForm.examId ? (
          <p>Chọn kỳ thi để xem danh sách đã đăng ký.</p>
        ) : loadingRegistrations ? (
          <p>Đang tải danh sách đã đăng ký...</p>
        ) : registrationRows.length === 0 ? (
          <p>Kỳ thi này chưa có sinh viên nào được đăng ký.</p>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mã đăng ký</th>
                    <th>Kỳ thi</th>
                    <th>Thí sinh</th>
                    <th>Trạng thái</th>
                    <th>Thời gian đăng ký</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {registrationRows.map((row) => (
                    <tr key={row.id ?? `${row.examId}-${row.userId}`}>
                      <td>{row.id ?? '-'}</td>
                      <td>{findExamLabel(row.examId)}</td>
                      <td>{findUserLabel(row.userId)}</td>
                      <td>{renderStatus(row.status)}</td>
                      <td>{formatDateTime(row.registeredAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="tiny-btn danger icon-only-btn"
                          onClick={() => handleRemoveRegistration(row)}
                          disabled={
                            loadingRegistrations ||
                            processingRegistrationId === (row.id ?? `${row.examId}-${row.userId}`)
                          }
                          aria-label={`Gỡ registration ${row.id ?? `${row.examId}-${row.userId}`}`}
                          title={processingRegistrationId === (row.id ?? `${row.examId}-${row.userId}`) ? 'Đang gỡ...' : 'Gỡ'}
                        >
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="registration-pagination">
              <span>Trang {registrationPage} / {registrationTotalPages || 1}</span>
              <div className="inline-actions">
                <button
                  type="button"
                  className="tiny-btn icon-only-btn"
                  onClick={() => fetchRegistrations(registrationForm.examId, registrationPage - 1)}
                  disabled={registrationPage <= 1 || loadingRegistrations}
                  aria-label="Trang trước"
                  title="Trang trước"
                >
                  <ChevronLeftIcon />
                </button>
                <button
                  type="button"
                  className="tiny-btn icon-only-btn"
                  onClick={() => fetchRegistrations(registrationForm.examId, registrationPage + 1)}
                  disabled={registrationPage >= (registrationTotalPages || 1) || loadingRegistrations}
                  aria-label="Trang sau"
                  title="Trang sau"
                >
                  <ChevronRightIcon />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
