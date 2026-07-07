import { getSessionStatusLabel, statusToBadgeClass } from '../../utils/examSessionStatus'
import { formatExamLabel } from '../../utils/examLabel'
import { SearchIcon} from '../ui/AppIcons'
export default function StudentSection({
  studentExamPage,
  fetchStudentRegisteredExams,
  loadingStudentExams,
  studentRegisteredExams,
  formatDateTime,
  handleTakeExam,
  takingExamId,
  studentExamTotalPages,
  examSearchInput,
  setExamSearchInput,
  appliedExamSearch,
  onSearch,
}) {
  // Note: per-row room assignment and errors are shown per item.
  // Do not rely on a single representative room across rows when deciding button state.
  const firstAssigned = studentRegisteredExams.find((r) => r.roomInfo && r.roomInfo.roomId)
  const visibleRows = studentRegisteredExams

  return (
    <section className="panel exam-list-panel">
      <h2>Kỳ thi đã đăng ký</h2>

      <div className="session-head">
        <div>
          <p className="student-exam-note">Chỉ hiển thị các kỳ thi bạn đã đăng ký.</p>
          <p className="student-exam-note">
            {firstAssigned?.roomInfo?.roomId
              ? `Phòng thi hiện tại: ${firstAssigned.roomInfo.roomCode || firstAssigned.roomInfo.roomId} · Ghế ${firstAssigned.roomInfo.seatNumber ?? '-'}`
              : 'Bạn chưa có phòng thi được gán.'}
          </p>
        </div>
        <div className="exam-filter-bar student-exam-filter-bar">
          <div className="exam-filter-field student-exam-filter-field">
            <span className="exam-filter-icon">⌕</span>
            <input
              type="text"
              className="exam-filter-input"
              placeholder="Tìm theo tên hoặc mã kỳ thi"
              value={examSearchInput}
              onChange={(e) => setExamSearchInput?.(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="search-compact-btn"
            onClick={onSearch}
            disabled={loadingStudentExams}
            aria-label="Tìm kỳ thi"
            title="Tìm"
          >
            {loadingStudentExams ? '…' : <SearchIcon size={14} />}
          </button>
          <button
            type="button"
            className="exam-filter-button tiny-btn"
            onClick={() => fetchStudentRegisteredExams(studentExamPage)}
            disabled={loadingStudentExams}
          >
            {loadingStudentExams ? 'Đang tải...' : 'Tải lại'}
          </button>
        </div>
      </div>

      {loadingStudentExams ? (
        <p>Đang tải danh sách kỳ thi...</p>
      ) : visibleRows.length === 0 ? (
        <p>{appliedExamSearch ? 'Không tìm thấy kỳ thi phù hợp.' : 'Bạn chưa đăng ký kỳ thi nào.'}</p>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Kỳ thi</th>
                  <th>Phòng thi</th>
                  <th>Đăng ký lúc</th>
                  <th>Bắt đầu</th>
                  <th>Kết thúc</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((item, index) => {
                  // Disable only when session is DONE/BLOCKED or backend returned an explicit roomError
                  const isDisabled = item.sessionStatus === 'DONE' || item.sessionStatus === 'BLOCKED' || Boolean(item.roomError)
                  const isLoading = takingExamId === Number(item.examId ?? item.exam?.id)
                  
                  let buttonText = 'Bắt đầu'
                  let buttonTitle = ''
                  if (isLoading) {
                    buttonText = 'Đang xử lý...'
                  } else if (item.sessionStatus === 'DONE' || item.sessionStatus === 'BLOCKED') {
                    buttonText = 'Đã hoàn thành'
                    buttonTitle = 'Kỳ thi này đã hoàn thành'
                  } else if (item.sessionStatus === 'PENDING_REVIEW') {
                    buttonText = 'Chờ giám thị duyệt'
                    buttonTitle = 'Phiên đang chờ giám thị duyệt'
                  } else if (item.sessionStatus === 'PENDING_DEVICE_APPROVAL') {
                    buttonText = 'Chờ duyệt thiết bị'
                    buttonTitle = 'Phiên đang chờ giám thị duyệt thiết bị'
                  } else if (item.sessionStatus === 'INIT') {
                    buttonText = 'Chờ điểm danh'
                    buttonTitle = 'Phiên đã khởi tạo. Bạn cần được giám thị điểm danh ngoài phòng thi.'
                  } else if (item.sessionStatus === 'CHECKED_IN') {
                    buttonText = 'Xác minh khuôn mặt'
                    buttonTitle = 'Bạn đã điểm danh, hãy xác minh khuôn mặt trước khi vào thi'
                  } else if (item.sessionStatus === 'IN_PROGRESS') {
                    buttonText = 'Tiếp tục thi'
                    buttonTitle = 'Tiếp tục phiên thi đang diễn ra'
                  } else if (item.roomError) {
                    buttonText = 'Không thể vào'
                    buttonTitle = 'Bạn chưa được gán phòng thi hoặc kỳ thi chưa hợp lệ để vào'
                  }

                  return (
                    <tr key={item.id ?? `${item.examId}-${item.userId}`}>
                      <td>{index + 1}</td>
                      <td>{formatExamLabel(item.exam)}</td>
                      <td>
                        {item.roomInfo?.roomId
                          ? `${item.roomInfo.roomCode || item.roomInfo.roomId || '-'}${item.roomInfo.seatNumber != null ? ` · Ghế ${item.roomInfo.seatNumber}` : ''}`
                          : '-'}
                        {item.roomError && (
                          <div className="room-error" title={item.roomError} style={{ color: '#c00', fontSize: '0.85em', marginTop: '4px' }}>
                            {item.roomError}
                          </div>
                        )}
                      </td>
                      <td>{formatDateTime(item.registeredAt)}</td>
                      <td>{formatDateTime(item.exam?.startTime)}</td>
                      <td>{formatDateTime(item.exam?.endTime)}</td>
                      <td>
                        <span className={`status-badge badge-${statusToBadgeClass(item.sessionStatus || 'NOT_STARTED')}`}>
                          {getSessionStatusLabel(item.sessionStatus) || 'Chưa làm'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="tiny-btn"
                          onClick={() => handleTakeExam(item)}
                          disabled={isDisabled || isLoading}
                          title={item.roomError ? item.roomError : buttonTitle}
                        >
                          {buttonText}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="registration-pagination">
            <span>Trang {studentExamPage} / {studentExamTotalPages || 1}</span>
            <div className="inline-actions">
              <button
                type="button"
                className="tiny-btn"
                onClick={() => fetchStudentRegisteredExams(studentExamPage - 1)}
                disabled={studentExamPage <= 1 || loadingStudentExams}
              >
                Trước
              </button>
              <button
                type="button"
                className="tiny-btn"
                onClick={() => fetchStudentRegisteredExams(studentExamPage + 1)}
                disabled={studentExamPage >= (studentExamTotalPages || 1) || loadingStudentExams}
              >
                Sau
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
