import { useEffect, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, RefreshIcon, SearchIcon, TrashIcon } from '../ui/AppIcons'

export default function RegistrationsSection({
  handleBatchRegister,
  registrationForm,
  onRegistrationChange,
  examOptions,
  handleSearchExams,
  registrationUserFilters,
  setRegistrationUserFilters,
  registrationUserAppliedFilters,
  toggleSelectAllFilteredUsers,
  loadingRegistrationUsers,
  filteredRegistrationUsers,
  handleSearchRegistrationUsers,
  registrationUserPage,
  registrationUserTotalPages,
  handlePrevRegistrationUserPage,
  handleNextRegistrationUserPage,
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
  const [examSearch, setExamSearch] = useState('')
  const [showExamDropdown, setShowExamDropdown] = useState(false)
  const [localExamSearch, setLocalExamSearch] = useState('')

  useEffect(() => {
    const selectedLabel = examOptions.find((opt) => String(opt.id) === String(registrationForm.examId))?.label || ''
    setExamSearch(selectedLabel)
    setLocalExamSearch(selectedLabel)
  }, [examOptions, registrationForm.examId])

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
          <div className="registration-exam-combobox">
          <input
            id="registrationExamId"
            type="text"
            value={localExamSearch}
            placeholder="Tìm kỳ thi..."
            onChange={(e) => {
              setLocalExamSearch(e.target.value)
              setShowExamDropdown(true)
              if (!e.target.value) {
                onRegistrationChange({ target: { name: 'examId', value: '' } })
              }
            }}
            onFocus={() => setShowExamDropdown(true)}
            onBlur={() => setTimeout(() => setShowExamDropdown(false), 150)}
            autoComplete="off"
          />
          <button
            type="button"
            className="tiny-btn"
            onClick={() => {
              if (typeof handleSearchExams === 'function') handleSearchExams(localExamSearch)
            }}
            style={{ marginLeft: 8 }}
          >
            <SearchIcon size={14} />
          </button>
          {showExamDropdown && (
            <ul className="registration-exam-dropdown" role="listbox">
              {examOptions
                .filter((opt) => (opt.label || '').toLowerCase().includes((localExamSearch || '').toLowerCase()))
                .map((opt) => (
                  <li
                    key={opt.id}
                    role="option"
                    onMouseDown={() => {
                      onRegistrationChange({ target: { name: 'examId', value: String(opt.id) } })
                      setExamSearch(opt.label || '')
                      setLocalExamSearch(opt.label || '')
                      setShowExamDropdown(false)
                    }}
                  >
                    {opt.label}
                  </li>
                ))}
            </ul>
          )}
        </div>

        <label htmlFor="registrationUserSearch">Danh sách sinh viên</label>
        <div className="registration-user-picker">
          <div className="registration-user-filter-grid">
            <input
              id="registrationUserName"
              value={registrationUserFilters.name}
              onChange={(e) => setRegistrationUserFilters((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Tìm theo tên"
            />
            <input
              id="registrationUserUsername"
              value={registrationUserFilters.username}
              onChange={(e) => setRegistrationUserFilters((prev) => ({ ...prev, username: e.target.value }))}
              placeholder="Tìm theo tài khoản"
            />
            <input
              id="registrationUserEmail"
              value={registrationUserFilters.email}
              onChange={(e) => setRegistrationUserFilters((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Tìm theo email"
            />
            <select
              value={registrationUserFilters.role}
              onChange={(e) => setRegistrationUserFilters((prev) => ({ ...prev, role: e.target.value }))}
              title="Lọc theo role"
            >
              <option value="STUDENT">STUDENT</option>
              <option value="PROCTOR">PROCTOR</option>
              <option value="ADMIN">ADMIN</option>
              <option value="ALL">Tất cả role</option>
            </select>
            <select
              value={registrationUserFilters.active}
              onChange={(e) => setRegistrationUserFilters((prev) => ({ ...prev, active: e.target.value }))}
              title="Lọc theo trạng thái"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="1">Đang hoạt động</option>
              <option value="0">Không hoạt động</option>
            </select>
          </div>

          <div className="registration-user-head">
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
              onClick={handleSearchRegistrationUsers}
              disabled={loadingRegistrationUsers}
            >
              <SearchIcon size={14} />
              {loadingRegistrationUsers ? 'Đang tìm...' : 'Search'}
            </button>
          </div>

          {Object.values(registrationUserAppliedFilters || {}).some((value) => String(value || '').trim()) ? (
            <small>Đang lọc theo nhiều tiêu chí đã nhập.</small>
          ) : null}

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

          <div className="registration-pagination">
            <span>Trang {registrationUserPage} / {registrationUserTotalPages || 1}</span>
            <div className="inline-actions">
              <button
                type="button"
                className="tiny-btn icon-only-btn"
                onClick={handlePrevRegistrationUserPage}
                disabled={registrationUserPage <= 1 || loadingRegistrationUsers}
                aria-label="Trang trước"
                title="Trang trước"
              >
                <ChevronLeftIcon />
              </button>
              <button
                type="button"
                className="tiny-btn icon-only-btn"
                onClick={handleNextRegistrationUserPage}
                disabled={registrationUserPage >= (registrationUserTotalPages || 1) || loadingRegistrationUsers}
                aria-label="Trang sau"
                title="Trang sau"
              >
                <ChevronRightIcon />
              </button>
            </div>
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
          <p>Tìm kỳ thi để xem danh sách đã đăng ký.</p>
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
                    <th>STT</th>
                    <th>Kỳ thi</th>
                    <th>Thí sinh</th>
                    <th>Trạng thái</th>
                    <th>Thời gian đăng ký</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {registrationRows.map((row, index) => (
                    <tr key={row.id ?? `${row.examId}-${row.userId}`}>
                      <td>{index + 1}</td>
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
