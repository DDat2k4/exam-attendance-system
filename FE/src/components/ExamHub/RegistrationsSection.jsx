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
  formatDateTime,
  handleRemoveRegistration,
  processingRegistrationId,
  registrationTotalPages,
}) {
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

        <label htmlFor="registrationUserSearch">Danh sách user</label>
        <div className="registration-user-picker">
          <div className="registration-user-head">
            <input
              id="registrationUserSearch"
              value={registrationUserQuery}
              onChange={(e) => setRegistrationUserQuery(e.target.value)}
              placeholder="Tìm theo ID, username, email hoặc name"
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
              {loadingRegistrationUsers ? 'Đang tải...' : 'Tải user'}
            </button>
          </div>

          <div className="registration-user-list">
            {loadingRegistrationUsers ? (
              <p>Đang tải danh sách user...</p>
            ) : filteredRegistrationUsers.length === 0 ? (
              <p>Không có user phù hợp.</p>
            ) : (
              filteredRegistrationUsers.map((u) => {
                const uid = Number(u?.id)
                const isChecked = selectedRegistrationUserIds.includes(uid)
                return (
                  <label key={u?.id ?? `${u?.username}-${u?.email}`} className="registration-user-item">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleRegistrationUser(uid)}
                    />
                    <span>#{u?.id ?? '-'} | {u?.username || '-'} | {u?.email || '-'}</span>
                  </label>
                )
              })
            )}
          </div>

          <small>
            Đã chọn {selectedRegistrationUserIds.length} user
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
            {loadingRegistrations ? 'Đang tải...' : 'Tải lại'}
          </button>
        </div>

        {!registrationForm.examId ? (
          <p>Chọn kỳ thi để xem danh sách đã đăng ký.</p>
        ) : loadingRegistrations ? (
          <p>Đang tải danh sách đã đăng ký...</p>
        ) : registrationRows.length === 0 ? (
          <p>Kỳ thi này chưa có user nào được đăng ký.</p>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Registration ID</th>
                    <th>Exam ID</th>
                    <th>User ID</th>
                    <th>Status</th>
                    <th>Registered At</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {registrationRows.map((row) => (
                    <tr key={row.id ?? `${row.examId}-${row.userId}`}>
                      <td>{row.id ?? '-'}</td>
                      <td>{row.examId ?? '-'}</td>
                      <td>{row.userId ?? '-'}</td>
                      <td>{row.status ?? '-'}</td>
                      <td>{formatDateTime(row.registeredAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="tiny-btn danger"
                          onClick={() => handleRemoveRegistration(row)}
                          disabled={
                            loadingRegistrations ||
                            processingRegistrationId === (row.id ?? `${row.examId}-${row.userId}`)
                          }
                        >
                          {processingRegistrationId === (row.id ?? `${row.examId}-${row.userId}`)
                            ? 'Đang gỡ...'
                            : 'Gỡ'}
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
                  className="tiny-btn"
                  onClick={() => fetchRegistrations(registrationForm.examId, registrationPage - 1)}
                  disabled={registrationPage <= 1 || loadingRegistrations}
                >
                  Trước
                </button>
                <button
                  type="button"
                  className="tiny-btn"
                  onClick={() => fetchRegistrations(registrationForm.examId, registrationPage + 1)}
                  disabled={registrationPage >= (registrationTotalPages || 1) || loadingRegistrations}
                >
                  Sau
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
