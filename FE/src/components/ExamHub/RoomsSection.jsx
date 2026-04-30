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
  return (
    <>
      <section className="panel">
        <h2>{editingRoomId ? `Cập nhật phòng thi #${editingRoomId}` : 'Tạo phòng thi'}</h2>
        <form className="grid-form" onSubmit={handleCreateRoom}>
          <label htmlFor="examId">Kỳ thi</label>
          <select id="examId" name="examId" value={roomForm.examId} onChange={onRoomChange}>
            <option value="">Chọn kỳ thi</option>
            {examOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>

          <label htmlFor="roomCode">Mã phòng</label>
          <input
            id="roomCode"
            name="roomCode"
            value={roomForm.roomCode}
            onChange={onRoomChange}
            placeholder="VD: A101"
          />

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

          <button className="primary" type="submit" disabled={submittingRoom || !canCreateRooms}>
            {submittingRoom ? 'Đang lưu...' : editingRoomId ? 'Cập nhật phòng' : 'Tạo phòng'}
          </button>

          {editingRoomId && (
            <button
              className="secondary"
              type="button"
              onClick={handleCancelEditRoom}
              disabled={submittingRoom}
            >
              Hủy chỉnh sửa
            </button>
          )}
        </form>
      </section>

      <section className="panel">
        <h2>Danh sách phòng thi</h2>

        <div style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: '8px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#2f3f82', marginBottom: '4px' }}>Mã phòng</label>
            <input
              type="text"
              placeholder="VD: A101"
              value={roomFilterCode}
              onChange={(e) => setRoomFilterCode(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #c8d2fa',
                borderRadius: '6px',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#2f3f82', marginBottom: '4px' }}>Kỳ thi</label>
            <input
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
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #c8d2fa',
                borderRadius: '6px',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            {showExamDropdown && filteredExamOptions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  background: '#ffffff',
                  border: '1px solid #c8d2fa',
                  borderTop: 'none',
                  borderRadius: '0 0 6px 6px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.08)',
                }}
              >
                {filteredExamOptions.map((opt) => (
                  <div
                    key={opt.id}
                    onMouseDown={() => {
                      setRoomFilterExamId(String(opt.id))
                      setExamFilterText(opt.label)
                      setShowExamDropdown(false)
                    }}
                    style={{
                      padding: '8px 10px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f0f0f0',
                      fontSize: '13px',
                      color: '#333',
                      transition: 'background 0.15s ease',
                      background: Number(roomFilterExamId) === opt.id ? '#f0f5ff' : '#fff',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f5f7ff'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = Number(roomFilterExamId) === opt.id ? '#f0f5ff' : '#fff'
                    }}
                  >
                    {opt.label}
                  </div>
                ))}

                {roomFilterExamId && (
                  <div
                    onMouseDown={() => {
                      setRoomFilterExamId('')
                      setExamFilterText('')
                      setShowExamDropdown(false)
                    }}
                    style={{
                      padding: '8px 10px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#999',
                      background: '#f9f9f9',
                      textAlign: 'center',
                      borderTop: '1px solid #e0e0e0',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f0f0f0'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f9f9f9'
                    }}
                  >
                    Xóa lọc
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#2f3f82', marginBottom: '4px' }}>Số lượng tối đa</label>
            <input
              type="number"
              placeholder="VD: 30"
              value={roomFilterMaxStudents}
              onChange={(e) => setRoomFilterMaxStudents(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #c8d2fa',
                borderRadius: '6px',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {(roomFilterCode || roomFilterExamId || roomFilterMaxStudents) && (
            <button
              type="button"
              onClick={() => {
                setRoomFilterCode('')
                setRoomFilterExamId('')
                setExamFilterText('')
                setRoomFilterMaxStudents('')
              }}
              style={{
                padding: '8px 12px',
                background: '#f5f7ff',
                border: '1px solid #cdd8ff',
                borderRadius: '6px',
                color: '#2e4288',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
              }}
            >
              Xóa lọc
            </button>
          )}

          <span
            style={{
              fontSize: '12px',
              color: '#5d6ea1',
              whiteSpace: 'nowrap',
              fontWeight: '500',
            }}
          >
            {roomFilterCode || roomFilterExamId || roomFilterMaxStudents
              ? `${roomRows.length} / ${roomTotalCount}`
              : `Tổng: ${roomTotalCount}`}
          </span>
        </div>
        {roomRows.length === 0 ? (
          <p>Chưa có phòng thi nào.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Room ID</th>
                  <th>Ma phong</th>
                  <th>Ky thi</th>
                  <th>So luong toi da</th>
                  <th>Thao tac</th>
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
                      <div className="room-action-stack">
                        <div className="room-action-row room-action-row--primary">
                          <button
                            type="button"
                            className="tiny-btn tiny-btn--primary"
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
                            Gán sinh viên
                          </button>

                          <button
                            type="button"
                            className="tiny-btn tiny-btn--primary"
                            onClick={() =>
                              handleOpenRoomStudents({
                                roomId,
                                roomCode: room.roomCode || room.code,
                                examTitle,
                              })
                            }
                            disabled={processingExamId === roomId}
                          >
                            Xem sinh viên
                          </button>
                        </div>

                        <div className="room-action-row room-action-row--secondary">
                          <button
                            type="button"
                            className="tiny-btn"
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
                            Sửa
                          </button>

                          <button
                            type="button"
                            className="tiny-btn danger"
                            onClick={() => handleDeleteRoom(roomId)}
                            disabled={processingExamId === roomId}
                          >
                            Xóa phòng
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
                  ×
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
                  ×
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
              className="tiny-btn"
              onClick={handlePrevRoomPage}
              disabled={roomCurrentPage <= 1}
            >
              Trước
            </button>
            <button
              type="button"
              className="tiny-btn"
              onClick={handleNextRoomPage}
              disabled={roomCurrentPage >= roomTotalPages}
            >
              Sau
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
