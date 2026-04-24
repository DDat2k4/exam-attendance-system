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
}) {
  const [showExamDropdown, setShowExamDropdown] = useState(false)
  const [examFilterText, setExamFilterText] = useState('')

  useEffect(() => {
    if (!roomFilterExamId) {
      setExamFilterText('')
      return
    }

    const matched = examOptions.find((opt) => String(opt.id) === String(roomFilterExamId))
    if (matched) {
      setExamFilterText(matched.label)
    }
  }, [roomFilterExamId, examOptions])

  const filteredExamOptions = useMemo(() => {
    if (!examFilterText.trim()) return examOptions
    const keyword = examFilterText.toLowerCase()
    return examOptions.filter(
      (opt) => opt.label.toLowerCase().includes(keyword) || String(opt.id).includes(keyword)
    )
  }, [examFilterText, examOptions])
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
                      <div className="table-actions">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
