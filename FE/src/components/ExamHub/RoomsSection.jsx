import { useMemo, useState } from 'react'

export default function RoomsSection({
  roomForm,
  onRoomChange,
  examOptions,
  submittingRoom,
  canCreateRooms,
  editingRoomId,
  roomRows,
  handleCreateRoom,
  handleSelectEditRoom,
  handleCancelEditRoom,
  handleDeleteRoom,
  processingExamId,
  roomFilterCode,
  setRoomFilterCode,
  roomFilterExamId,
  setRoomFilterExamId,
  roomFilterMaxStudents,
  setRoomFilterMaxStudents,
  roomCurrentPage,
  roomTotalPages,
  roomTotalCount,
  handlePrevRoomPage,
  handleNextRoomPage,
  showAssignRoomModal,
  assignRoomTarget,
  assignableRegistrations,
  loadingAssignableRegistrations,
  assignRegistrationQuery,
  setAssignRegistrationQuery,
  pendingRoomAssignments,
  handleAddRoomAssignment,
  handleUpdateRoomAssignmentSeat,
  handleRemoveRoomAssignment,
  submittingRoomAssignment,
  assignRoomError,
  showRoomStudentsModal,
  roomStudentsTarget,
  roomStudents,
  loadingRoomStudents,
  roomStudentsError,
  handleOpenAssignRoom,
  handleCloseAssignRoom,
  handleAssignRoom,
  handleOpenRoomStudents,
  handleCloseRoomStudents,
  showRoomFormModal,
  closeRoomFormModal,
}) {
  const [showExamDropdown, setShowExamDropdown] = useState(false)
  const [examFilterText, setExamFilterText] = useState('')
  const [showRegistrationDropdown, setShowRegistrationDropdown] = useState(false)

  const filteredExamOptions = useMemo(() => {
    if (!examFilterText.trim()) return examOptions
    const keyword = examFilterText.toLowerCase()
    return examOptions.filter(
      (opt) => opt.label.toLowerCase().includes(keyword) || String(opt.id).includes(keyword)
    )
  }, [examFilterText, examOptions])

  const filteredAssignableRegistrations = useMemo(() => {
    const keyword = String(assignRegistrationQuery || '').trim().toLowerCase()

    return assignableRegistrations.filter((row) => {
      if (!keyword) return true

      const fields = [
        row?.id,
        row?.userId,
        row?.userUsername,
        row?.userEmail,
        row?.userFullName,
        row?.userCitizenId,
        row?.status,
      ]

      return fields.some((field) => String(field ?? '').toLowerCase().includes(keyword))
    })
  }, [assignableRegistrations, assignRegistrationQuery])

  const handleRegistrationQueryChange = (value) => {
    setAssignRegistrationQuery(value)
    setShowRegistrationDropdown(true)
  }

  const ActionIcon = ({ children }) => (
    <svg className="room-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {children}
    </svg>
  )

  const CloseIcon = () => (
    <ActionIcon>
      <path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </ActionIcon>
  )

  const ChevronLeftIcon = () => (
    <ActionIcon>
      <path d="M14.5 5.8 8.3 12l6.2 6.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </ActionIcon>
  )

  const ChevronRightIcon = () => (
    <ActionIcon>
      <path d="M9.5 5.8 15.7 12l-6.2 6.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </ActionIcon>
  )

  return (
    <>
      {canCreateRooms && showRoomFormModal && (
        <div className="proctor-room-modal-overlay" onClick={closeRoomFormModal} role="presentation">
          <div className="assign-room-modal exam-form-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="assign-room-modal__header">
              <div>
                <h3>{editingRoomId ? `Cập nhật phòng thi #${editingRoomId}` : 'Tạo phòng thi mới'}</h3>
                <p>Nhập thông tin phòng thi và lưu thay đổi để cập nhật danh sách.</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={closeRoomFormModal} aria-label="Đóng">
                <CloseIcon />
              </button>
            </div>

            <form className="grid-form exam-form-grid room-form-grid" onSubmit={handleCreateRoom}>
              <div className="exam-field exam-field--full">
                <label htmlFor="examId">Kỳ thi</label>
                <select id="examId" name="examId" value={roomForm.examId} onChange={onRoomChange}>
                  <option value="">Chọn kỳ thi</option>
                  {examOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="exam-field-row">
                <div className="exam-field exam-field--half">
                  <label htmlFor="roomCode">Mã phòng</label>
                  <input
                    id="roomCode"
                    name="roomCode"
                    value={roomForm.roomCode}
                    onChange={onRoomChange}
                    placeholder="VD: A101"
                  />
                </div>

                <div className="exam-field exam-field--half">
                  <label htmlFor="maxStudents">Số lượng tối đa</label>
                  <input
                    id="maxStudents"
                    type="number"
                    min="1"
                    name="maxStudents"
                    value={roomForm.maxStudents}
                    onChange={onRoomChange}
                    placeholder="VD: 30"
                  />
                </div>
              </div>

              <div className="inline-actions exam-form-actions">
                <button
                  className="secondary"
                  type="button"
                  onClick={closeRoomFormModal}
                  disabled={submittingRoom}
                >
                  Hủy
                </button>
                <button className="primary" type="submit" disabled={submittingRoom || !canCreateRooms}>
                  {submittingRoom ? 'Đang lưu...' : editingRoomId ? 'Cập nhật phòng' : 'Tạo phòng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="panel">
        <h2>Danh sách phòng thi</h2>

        <div className="rooms-toolbar">
          <div className="rooms-toolbar__filters">
            <div className="rooms-filter-group">
              <label htmlFor="roomFilterCode">Mã phòng</label>
              <input
                id="roomFilterCode"
                type="text"
                placeholder="VD: A101"
                value={roomFilterCode}
                onChange={(e) => setRoomFilterCode(e.target.value)}
                className="rooms-filter-input"
              />
            </div>

            <div className="rooms-filter-group rooms-filter-group--exam" style={{ position: 'relative' }}>
              <label htmlFor="roomFilterExamId">Kỳ thi</label>
              <input
                id="roomFilterExamId"
                type="text"
                placeholder="Gõ để tìm kỳ thi..."
                value={examFilterText}
                onChange={(e) => {
                  const value = e.target.value
                  setExamFilterText(value)
                  setRoomFilterExamId(value)
                }}
                onFocus={() => setShowExamDropdown(true)}
                onBlur={() => setTimeout(() => setShowExamDropdown(false), 150)}
                className="rooms-filter-input"
              />

              {showExamDropdown && filteredExamOptions.length > 0 && (
                <div className="rooms-exam-dropdown" role="listbox">
                  {filteredExamOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className="rooms-exam-dropdown__item"
                      onMouseDown={() => {
                        setRoomFilterExamId(String(opt.id))
                        setExamFilterText(opt.label)
                        setShowExamDropdown(false)
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}

                  {roomFilterExamId && (
                    <button
                      type="button"
                      className="rooms-exam-dropdown__clear rooms-icon-only-btn"
                      aria-label="Xóa lọc kỳ thi"
                      onMouseDown={() => {
                        setRoomFilterExamId('')
                        setExamFilterText('')
                        setShowExamDropdown(false)
                      }}
                    >
                      <CloseIcon />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="rooms-filter-group">
              <label htmlFor="roomFilterMaxStudents">Số lượng tối đa</label>
            <input
              id="roomFilterMaxStudents"
              type="number"
              placeholder="VD: 30"
              value={roomFilterMaxStudents}
              onChange={(e) => setRoomFilterMaxStudents(e.target.value)}
              className="rooms-filter-input"
            />
            </div>
          </div>

          <div className="rooms-toolbar__meta">
            {(roomFilterCode || roomFilterExamId || roomFilterMaxStudents) && (
            <button
              type="button"
              className="rooms-filter-reset rooms-icon-only-btn"
              aria-label="Xóa toàn bộ bộ lọc"
              onClick={() => {
                setRoomFilterCode('')
                setRoomFilterExamId('')
                setExamFilterText('')
                setRoomFilterMaxStudents('')
              }}
            >
              <CloseIcon />
            </button>
            )}

            <span className="rooms-filter-count">
              {roomFilterCode || roomFilterExamId || roomFilterMaxStudents
                ? `${roomRows.length} / ${roomTotalCount}`
                : `Tổng: ${roomTotalCount}`}
            </span>
          </div>
        </div>
        {roomRows.length === 0 ? (
          <p>Chưa có phòng thi nào.</p>
        ) : (
          <div className="table-wrap">
            <table className="rooms-table">
              <thead>
                <tr>
                  <th>Room ID</th>
                  <th>Mã phòng</th>
                  <th>Kỳ thi</th>
                  <th>Số lượng tối đa</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {roomRows.map(({ examId, examTitle, room, roomId }) => (
                  <tr key={`${examId}-${roomId ?? 'room'}`}>
                    <td>{roomId ?? '-'}</td>
                    <td>{room.roomCode || room.code || '-'}</td>
                    <td>{examTitle || `#${examId}`}</td>
                    <td>{room.maxStudents ?? '-'}</td>
                    <td>
                      <div className="room-action-grid">
                        <div className="room-action-row room-action-row--all">
                          <button
                            type="button"
                            className="tiny-btn tiny-btn--primary room-icon-btn"
                            title="Gán sinh viên"
                            aria-label="Gán sinh viên"
                            onClick={() =>
                              handleOpenAssignRoom({
                                roomId,
                                examId,
                                roomCode: room.roomCode || room.code,
                                examTitle,
                              })
                            }
                            disabled={processingExamId === roomId}
                          >
                            <ActionIcon>
                              <path d="M8.5 11.2a3.2 3.2 0 1 0 0-6.4a3.2 3.2 0 0 0 0 6.4Zm7 1a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5ZM3.8 20c.5-3.3 2.8-5 4.7-5s4.2 1.7 4.7 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M14.5 20c.2-2.2 1.6-3.8 3.6-4.5c1.2-.4 2.4-.3 3.2.1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </ActionIcon>
                          </button>

                          <button
                            type="button"
                            className="tiny-btn tiny-btn--primary room-icon-btn"
                            title="Xem sinh viên"
                            aria-label="Xem sinh viên"
                            onClick={() =>
                              handleOpenRoomStudents({
                                roomId,
                                roomCode: room.roomCode || room.code,
                                examTitle,
                              })
                            }
                            disabled={processingExamId === roomId}
                          >
                            <ActionIcon>
                              <path d="M2.8 12s3.1-6 9.2-6s9.2 6 9.2 6s-3.1 6-9.2 6S2.8 12 2.8 12Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                              <circle cx="12" cy="12" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                            </ActionIcon>
                          </button>

                          <button
                            type="button"
                            className="tiny-btn room-icon-btn"
                            title="Sửa phòng"
                            aria-label="Sửa phòng"
                            onClick={() =>
                              handleSelectEditRoom({
                                roomId,
                                examId,
                                roomCode: room.roomCode || room.code,
                                maxStudents: room.maxStudents,
                              })
                            }
                            disabled={processingExamId === roomId}
                          >
                            <ActionIcon>
                              <path d="M4.5 15.5 15.8 4.2c.5-.5 1.2-.5 1.7 0l2.3 2.3c.5.5.5 1.2 0 1.7L8.5 19.5l-4.7.9.7-4.9Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                              <path d="M13.7 6.3 17.8 10.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                            </ActionIcon>
                          </button>

                          <button
                            type="button"
                            className="tiny-btn danger room-icon-btn"
                            title="Xóa phòng"
                            aria-label="Xóa phòng"
                            onClick={() => handleDeleteRoom(roomId)}
                            disabled={processingExamId === roomId}
                          >
                            <ActionIcon>
                              <path d="M4.5 7h15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                              <path d="M9 7V5.8c0-.7.6-1.3 1.3-1.3h3.4c.7 0 1.3.6 1.3 1.3V7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M7.8 7.5l.5 11.2c0 .8.6 1.3 1.3 1.3h4.8c.7 0 1.3-.5 1.3-1.3l.5-11.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                              <path d="M10.2 10.2v5.6M13.8 10.2v5.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </ActionIcon>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showAssignRoomModal && assignRoomTarget && (
          <div
            className="proctor-room-modal-overlay"
            onClick={handleCloseAssignRoom}
            role="presentation"
          >
            <div className="assign-room-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <div className="assign-room-modal__header">
                <div>
                  <h3>Gán sinh viên vào phòng thi</h3>
                  <p>Chọn một registration và số ghế cho phòng đang mở.</p>
                </div>
                <button type="button" className="assign-room-modal__close" onClick={handleCloseAssignRoom} aria-label="Đóng">
                  <CloseIcon />
                </button>
              </div>

              <div className="assign-room-modal__summary">
                <span className="assign-room-chip">Phòng #{assignRoomTarget.roomId}{assignRoomTarget.roomCode ? ` - ${assignRoomTarget.roomCode}` : ''}</span>
                <span className="assign-room-chip">Kỳ thi: {assignRoomTarget.examTitle || `#${assignRoomTarget.examId}`}</span>
              </div>

              <form className="assign-room-form" onSubmit={handleAssignRoom}>
                {assignRoomError ? <div className="feedback error">{assignRoomError}</div> : null}

                <div className="assign-room-section-title">Tìm và thêm sinh viên</div>
                <div className="assign-room-combobox">
                  <input
                    id="assignRegistrationQuery"
                    type="text"
                    value={assignRegistrationQuery}
                    onChange={(e) => handleRegistrationQueryChange(e.target.value)}
                    onFocus={() => setShowRegistrationDropdown(true)}
                    onBlur={() => setTimeout(() => setShowRegistrationDropdown(false), 150)}
                    placeholder="Tìm theo registration, userId, username, họ tên, CCCD"
                    disabled={loadingAssignableRegistrations}
                    autoComplete="off"
                  />

                  {showRegistrationDropdown && !loadingAssignableRegistrations && (
                    <div className="assign-room-combobox__dropdown" role="listbox">
                      {filteredAssignableRegistrations.length === 0 ? (
                        <div className="assign-room-combobox__empty">Không tìm thấy sinh viên phù hợp.</div>
                      ) : (
                        filteredAssignableRegistrations.map((row) => {
                          const userLabel = row?.userDisplayName || row?.userFullName || row?.userUsername || `User #${row?.userId}`
                          const metaParts = [
                            row?.userUsername ? `@${row.userUsername}` : '',
                            row?.userEmail || '',
                            row?.userCitizenId ? `CCCD: ${row.userCitizenId}` : '',
                          ].filter(Boolean)

                          return (
                            <button
                              key={row.id}
                              type="button"
                              className="assign-room-combobox__item"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                handleAddRoomAssignment(row)
                                setShowRegistrationDropdown(false)
                              }}
                            >
                              <strong>#{row.id} - {userLabel}</strong>
                              <span>{metaParts.join(' · ') || 'Không có thông tin bổ sung'}</span>
                              <small>Bấm để thêm vào danh sách gán</small>
                            </button>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>

                <div className="assign-room-section-title">Danh sách sẽ được gán</div>
                {pendingRoomAssignments.length === 0 ? (
                  <div className="assign-room-selected">Chưa có sinh viên nào trong danh sách.</div>
                ) : (
                  <div className="assign-room-batch-list">
                    {pendingRoomAssignments.map((item, index) => (
                      <div key={item.registrationId} className="assign-room-batch-item">
                        <div className="assign-room-batch-item__info">
                          <strong>{index + 1}. #{item.registrationId} - {item.label}</strong>
                          <span>{item.meta || 'Không có thông tin bổ sung'}</span>
                        </div>
                        <div className="assign-room-batch-item__controls">
                          <input
                            type="number"
                            min="1"
                            value={item.seatNumber}
                            onChange={(e) => handleUpdateRoomAssignmentSeat(item.registrationId, e.target.value)}
                            placeholder="Ghế"
                            aria-label={`Số ghế cho registration ${item.registrationId}`}
                          />
                          <button
                            type="button"
                            className="tiny-btn danger"
                            onClick={() => handleRemoveRoomAssignment(item.registrationId)}
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="assign-room-modal__hint">
                  {loadingAssignableRegistrations ? (
                    <span>Đang tải danh sách registration...</span>
                  ) : filteredAssignableRegistrations.length === 0 ? (
                    <span>Không có registration nào cho kỳ thi này.</span>
                  ) : String(assignRegistrationQuery || '').trim() ? (
                    <span>Đang lọc còn {filteredAssignableRegistrations.length} registration. Bấm vào item để thêm.</span>
                  ) : (
                    <span>Có {filteredAssignableRegistrations.length} registration khả dụng.</span>
                  )}
                </div>

                <div className="assign-room-actions">
                  <button type="button" className="secondary" onClick={handleCloseAssignRoom}>
                    Hủy
                  </button>
                  <button type="submit" className="primary" disabled={submittingRoomAssignment || loadingAssignableRegistrations}>
                    {submittingRoomAssignment ? 'Đang gán...' : 'Xác nhận gán'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showRoomStudentsModal && roomStudentsTarget && (
          <div
            className="proctor-room-modal-overlay"
            onClick={handleCloseRoomStudents}
            role="presentation"
          >
            <div className="room-students-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <div className="room-students-modal__header">
                <div>
                  <h3>Sinh viên trong phòng thi</h3>
                  <p>
                    Phòng #{roomStudentsTarget.roomId}
                    {roomStudentsTarget.roomCode ? ` - ${roomStudentsTarget.roomCode}` : ''}
                    {roomStudentsTarget.examTitle ? ` | ${roomStudentsTarget.examTitle}` : ''}
                  </p>
                </div>
                <button type="button" className="assign-room-modal__close" onClick={handleCloseRoomStudents} aria-label="Đóng">
                  <CloseIcon />
                </button>
              </div>

              {roomStudentsError ? <div className="feedback error">{roomStudentsError}</div> : null}

              <div className="room-students-modal__content">
                {loadingRoomStudents ? (
                  <p>Đang tải danh sách sinh viên...</p>
                ) : roomStudents.length === 0 ? (
                  <p>Chưa có sinh viên nào trong phòng này.</p>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Registration ID</th>
                          <th>User ID</th>
                          <th>Username</th>
                          <th>Họ tên</th>
                          <th>CCCD</th>
                          <th>Số ghế</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roomStudents.map((student) => (
                          <tr key={student.registrationId ?? `${student.userId}-${student.seatNumber}`}>
                            <td>{student.registrationId ?? '-'}</td>
                            <td>{student.userId ?? '-'}</td>
                            <td>{student.username || '-'}</td>
                            <td>{student.fullName || '-'}</td>
                            <td>{student.citizenId || '-'}</td>
                            <td>{student.seatNumber ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="room-students-actions">
                <button type="button" className="secondary" onClick={handleCloseRoomStudents}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="registration-pagination" style={{ marginTop: '12px' }}>
          <span>Trang {roomCurrentPage} / {roomTotalPages} • Tổng {roomTotalCount}</span>
          <div className="inline-actions">
            <button
              type="button"
              className="tiny-btn room-pager-btn"
              onClick={handlePrevRoomPage}
              disabled={roomCurrentPage <= 1}
              aria-label="Trang trước"
              title="Trang trước"
            >
              <ChevronLeftIcon />
            </button>
            <button
              type="button"
              className="tiny-btn room-pager-btn"
              onClick={handleNextRoomPage}
              disabled={roomCurrentPage >= roomTotalPages}
              aria-label="Trang sau"
              title="Trang sau"
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
