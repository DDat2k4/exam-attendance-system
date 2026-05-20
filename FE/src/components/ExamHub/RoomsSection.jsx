import { useEffect, useMemo, useState } from 'react'

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
  handleDeleteRoom,
  handleOpenAssignRoom,
  handleCloseAssignRoom,
  handleAssignRoom,
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
  canManageRoomStudents,
  selectedRoomStudentIds,
  handleToggleRoomStudentSelection,
  handleSelectAllRoomStudents,
  handleClearRoomStudentSelection,
  handleUnassignRoomStudent,
  handleUnassignSelectedRoomStudents,
  processingRoomStudentId,
  processingRoomStudentBatch,
  handleOpenRoomStudents,
  handleCloseRoomStudents,
  showRoomFormModal,
  closeRoomFormModal,
}) {
  const [showRoomExamSearchDropdown, setShowRoomExamSearchDropdown] = useState(false)
  const [roomExamSearchText, setRoomExamSearchText] = useState('')
  const [showRoomFilterExamDropdown, setShowRoomFilterExamDropdown] = useState(false)
  const [roomFilterExamText, setRoomFilterExamText] = useState('')
  const [showRegistrationDropdown, setShowRegistrationDropdown] = useState(false)

  useEffect(() => {
    if (!showRoomFormModal) {
      setShowRoomExamSearchDropdown(false)
      return
    }

    const selectedExam = examOptions.find((opt) => String(opt.id) === String(roomForm.examId))
    setRoomExamSearchText(selectedExam?.label || '')
  }, [examOptions, roomForm.examId, showRoomFormModal])

  useEffect(() => {
    if (!roomFilterExamId) {
      setRoomFilterExamText('')
    }
  }, [roomFilterExamId])

  const filteredRoomExamOptions = useMemo(() => {
    if (!roomExamSearchText.trim()) return examOptions
    const keyword = roomExamSearchText.toLowerCase()
    return examOptions.filter(
      (opt) => opt.label.toLowerCase().includes(keyword) || String(opt.id).includes(keyword)
    )
  }, [roomExamSearchText, examOptions])

  const filteredRoomFilterExamOptions = useMemo(() => {
    if (!roomFilterExamText.trim()) return examOptions
    const keyword = roomFilterExamText.toLowerCase()
    return examOptions.filter(
      (opt) => opt.label.toLowerCase().includes(keyword) || String(opt.id).includes(keyword)
    )
  }, [roomFilterExamText, examOptions])

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

  const PencilIcon = () => (
    <ActionIcon>
      <path
        d="M4.5 15.5 15.8 4.2c.5-.5 1.2-.5 1.7 0l2.3 2.3c.5.5.5 1.2 0 1.7L8.5 19.5l-4.7.9.7-4.9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M13.7 6.3 17.8 10.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </ActionIcon>
  )

  const TrashIcon = () => (
    <ActionIcon>
      <path d="M4.5 7h15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M9 7V5.8c0-.7.6-1.3 1.3-1.3h3.4c.7 0 1.3.6 1.3 1.3V7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.8 7.5l.5 11.2c0 .8.6 1.3 1.3 1.3h4.8c.7 0 1.3-.5 1.3-1.3l.5-11.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10.2 10.2v5.6M13.8 10.2v5.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </ActionIcon>
  )

  const AssignIcon = () => (
    <ActionIcon>
      <path d="M7.5 10.2a3.2 3.2 0 1 0 0-6.4a3.2 3.2 0 0 0 0 6.4Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M2.8 18.2c0-2.6 2.2-4.6 4.7-4.6h.9c1.3 0 2.5.4 3.4 1.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.2 12.2v5M13.7 14.7h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </ActionIcon>
  )

  return (
    <>
      {canCreateRooms && showRoomFormModal && (
        <div className="proctor-room-modal-overlay" onClick={closeRoomFormModal} role="presentation">
          <div className="assign-room-modal exam-form-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="assign-room-modal__header">
              <div>
                <h3>{editingRoomId ? `Cập nhật phòng thi ${editingRoomId}` : 'Tạo phòng thi mới'}</h3>
                <p>Nhập thông tin phòng thi và lưu thay đổi để cập nhật danh sách.</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={closeRoomFormModal} aria-label="Đóng">
                <CloseIcon />
              </button>
            </div>

            <form className="grid-form exam-form-grid room-form-grid" onSubmit={handleCreateRoom}>
              <div className="exam-field exam-field--full" style={{ position: 'relative' }}>
                <label htmlFor="examId">Kỳ thi</label>
                <input
                  id="examId"
                  type="text"
                  placeholder="Tìm kỳ thi..."
                    value={roomExamSearchText}
                  onChange={(e) => {
                    const value = e.target.value
                    setRoomExamSearchText(value)
                    if (!value) {
                      onRoomChange({ target: { name: 'examId', value: '' } })
                    }
                    setShowRoomExamSearchDropdown(true)
                  }}
                  onFocus={() => setShowRoomExamSearchDropdown(true)}
                  onBlur={() => setTimeout(() => setShowRoomExamSearchDropdown(false), 150)}
                  autoComplete="off"
                />

                {showRoomExamSearchDropdown && filteredRoomExamOptions.length > 0 && (
                  <div className="rooms-exam-dropdown" role="listbox">
                    {filteredRoomExamOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className="rooms-exam-dropdown__item"
                        onMouseDown={() => {
                          onRoomChange({ target: { name: 'examId', value: String(opt.id) } })
                          setRoomExamSearchText(opt.label)
                          setShowRoomExamSearchDropdown(false)
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
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
                value={roomFilterExamText}
                onChange={(e) => {
                  const value = e.target.value
                  setRoomFilterExamText(value)
                  setRoomFilterExamId(value)
                }}
                onFocus={() => setShowRoomFilterExamDropdown(true)}
                onBlur={() => setTimeout(() => setShowRoomFilterExamDropdown(false), 150)}
                className="rooms-filter-input"
              />

              {showRoomFilterExamDropdown && filteredRoomFilterExamOptions.length > 0 && (
                <div className="rooms-exam-dropdown" role="listbox">
                  {filteredRoomFilterExamOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className="rooms-exam-dropdown__item"
                      onMouseDown={() => {
                        setRoomFilterExamId(String(opt.id))
                        setRoomFilterExamText(opt.label)
                        setShowRoomFilterExamDropdown(false)
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
                        setRoomFilterExamText('')
                        setShowRoomFilterExamDropdown(false)
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
                  <th>ID phòng</th>
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
                    <td>{examTitle || `${examId}`}</td>
                    <td>{room.maxStudents ?? '-'}</td>
                    <td>
                      <div className="room-action-grid">
                        <div className="room-action-row room-action-row--all">
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
                        </div>

                        {canCreateRooms ? (
                          <div className="room-action-row room-action-row--admin">
                            <button
                              type="button"
                              className="tiny-btn tiny-btn--primary room-icon-btn"
                              onClick={() =>
                                handleOpenAssignRoom({
                                  roomId,
                                  examId,
                                  roomCode: room.roomCode || room.code,
                                  examTitle,
                                })
                              }
                              title="Gán sinh viên"
                              aria-label="Gán sinh viên"
                              disabled={processingExamId === roomId}
                            >
                              <AssignIcon />
                            </button>
                            <button
                              type="button"
                              className="tiny-btn tiny-btn--primary room-icon-btn"
                              onClick={() =>
                                handleSelectEditRoom({
                                  roomId,
                                  examId,
                                  roomCode: room.roomCode || room.code,
                                  maxStudents: room.maxStudents,
                                })
                              }
                              title="Sửa phòng"
                              aria-label="Sửa phòng"
                            >
                              <PencilIcon />
                            </button>
                            <button
                              type="button"
                              className="tiny-btn danger room-icon-btn"
                              onClick={() => handleDeleteRoom(roomId)}
                              disabled={processingExamId === roomId}
                              title="Xóa phòng"
                              aria-label="Xóa phòng"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        ) : null}
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
                <span className="assign-room-chip">Phòng {assignRoomTarget.roomId}{assignRoomTarget.roomCode ? ` - ${assignRoomTarget.roomCode}` : ''}</span>
                <span className="assign-room-chip">Kỳ thi: {assignRoomTarget.examTitle || `${assignRoomTarget.examId}`}</span>
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
                    placeholder="Tìm theo ID đăng ký, ID người dùng, tên đăng nhập, họ tên, CCCD"
                    disabled={loadingAssignableRegistrations}
                    autoComplete="off"
                  />

                  {showRegistrationDropdown && !loadingAssignableRegistrations && (
                    <div className="assign-room-combobox__dropdown" role="listbox">
                      {filteredAssignableRegistrations.length === 0 ? (
                        <div className="assign-room-combobox__empty">Không tìm thấy sinh viên phù hợp.</div>
                      ) : (
                        filteredAssignableRegistrations.map((row) => {
                          const userLabel = row?.userDisplayName || row?.userFullName || row?.userUsername || `User ${row?.userId}`
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
                    <span>Đang tải danh sách đăng ký...</span>
                  ) : filteredAssignableRegistrations.length === 0 ? (
                    <span>Không có đăng ký nào cho kỳ thi này.</span>
                  ) : String(assignRegistrationQuery || '').trim() ? (
                    <span>Đang lọc còn {filteredAssignableRegistrations.length} đăng ký. Bấm vào item để thêm.</span>
                  ) : (
                    <span>Có {filteredAssignableRegistrations.length} đăng ký khả dụng.</span>
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
                    Phòng {roomStudentsTarget.roomId}
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
                  <>
                    {canManageRoomStudents ? (
                      <div className="room-students-toolbar">
                        <div className="room-students-toolbar__summary">
                          <strong>{selectedRoomStudentIds.length > 0 ? `${selectedRoomStudentIds.length} sinh viên đã chọn` : 'Chưa chọn sinh viên nào'}</strong>
                          <span>{roomStudents.length} sinh viên trong phòng</span>
                        </div>
                        <div className="room-students-toolbar__actions">
                          <button type="button" className="tiny-btn" onClick={handleSelectAllRoomStudents} disabled={loadingRoomStudents || roomStudents.length === 0}>
                            Chọn tất cả
                          </button>
                          <button type="button" className="tiny-btn" onClick={handleClearRoomStudentSelection} disabled={selectedRoomStudentIds.length === 0}>
                            Bỏ chọn
                          </button>
                          <button
                            type="button"
                            className="tiny-btn danger"
                            onClick={handleUnassignSelectedRoomStudents}
                            disabled={selectedRoomStudentIds.length === 0 || processingRoomStudentBatch}
                          >
                            {processingRoomStudentBatch ? 'Đang bỏ gán...' : 'Bỏ gán đã chọn'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="room-students-toolbar room-students-toolbar--readonly">
                        <div className="room-students-toolbar__summary">
                          <strong>Chế độ xem</strong>
                          <span>{roomStudents.length} sinh viên trong phòng</span>
                        </div>
                      </div>
                    )}

                    <div className="table-wrap">
                    <table className="room-students-table">
                      <thead>
                        <tr>
                          {canManageRoomStudents ? (
                            <th className="room-students-select-col">
                              <input
                                type="checkbox"
                                checked={roomStudents.length > 0 && selectedRoomStudentIds.length === roomStudents.length}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    handleSelectAllRoomStudents()
                                    return
                                  }

                                  handleClearRoomStudentSelection()
                                }}
                                disabled={loadingRoomStudents || roomStudents.length === 0}
                                aria-label="Chọn tất cả sinh viên"
                              />
                            </th>
                          ) : null}
                          <th>ID</th>
                          <th>Tên đăng nhập</th>
                          <th>Họ tên</th>
                          <th>CCCD</th>
                          <th>Số ghế</th>
                          {canManageRoomStudents ? <th className="room-students-action-col">Thao tác</th> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {roomStudents.map((student) => (
                          <tr
                            key={student.registrationId ?? `${student.userId}-${student.seatNumber}`}
                            className={selectedRoomStudentIds.includes(Number(student.registrationId)) ? 'is-selected' : ''}
                          >
                            {canManageRoomStudents ? (
                              <td className="room-students-select-col">
                                <input
                                  type="checkbox"
                                  checked={selectedRoomStudentIds.includes(Number(student.registrationId))}
                                  onChange={() => handleToggleRoomStudentSelection(student.registrationId)}
                                  disabled={processingRoomStudentBatch || processingRoomStudentId === Number(student.registrationId)}
                                  aria-label={`Chọn sinh viên ${student.username || student.fullName || student.registrationId}`}
                                />
                              </td>
                            ) : null}
                            <td>{student.registrationId ?? '-'}</td>
                            <td>{student.username || '-'}</td>
                            <td>{student.fullName || '-'}</td>
                            <td>{student.citizenId || '-'}</td>
                            <td>{student.seatNumber ?? '-'}</td>
                            {canManageRoomStudents ? (
                              <td className="room-students-action-col">
                                <div className="room-students-row-actions">
                                  <button
                                    type="button"
                                    className="tiny-btn danger"
                                    onClick={() => handleUnassignRoomStudent(student)}
                                    disabled={processingRoomStudentBatch || processingRoomStudentId === Number(student.registrationId)}
                                  >
                                    {processingRoomStudentId === Number(student.registrationId) ? 'Đang bỏ gán...' : 'Bỏ gán'}
                                  </button>
                                </div>
                              </td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </>
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
