import { getSessionStatusLabel, statusToBadgeClass } from '../../utils/examSessionStatus'

export default function StudentSection({
  studentExamPage,
  fetchStudentRegisteredExams,
  loadingStudentExams,
  studentRegisteredExams,
  formatDateTime,
  handleTakeExam,
  takingExamId,
  studentExamTotalPages,
}) {
  // Determine a representative assigned room from the fetched registrations (if any)
  const assigned = studentRegisteredExams.find((r) => r.roomInfo && r.roomInfo.roomId)
  const roomExamId = Number(assigned?.examId)

  return (
    <section className="panel">
      <h2>Kỳ thi đã đăng ký</h2>

      <div className="session-head">
        <div>
          <p className="student-exam-note">Chỉ hiển thị các kỳ thi bạn đã đăng ký.</p>
          <p className="student-exam-note">
            {assigned?.roomInfo?.roomId
              ? `Phòng thi hiện tại: ${assigned.roomInfo.roomCode || assigned.roomInfo.roomId} · Ghế ${assigned.roomInfo.seatNumber ?? '-'}`
              : 'Bạn chưa có phòng thi được gán.'}
          </p>
        </div>
        <button
          type="button"
          className="tiny-btn"
          onClick={() => fetchStudentRegisteredExams(studentExamPage)}
          disabled={loadingStudentExams}
        >
          {loadingStudentExams ? 'Đang tải...' : 'Tải lại'}
        </button>
      </div>

      {loadingStudentExams ? (
        <p>Đang tải danh sách kỳ thi...</p>
      ) : studentRegisteredExams.length === 0 ? (
        <p>Bạn chưa đăng ký kỳ thi nào.</p>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Registration ID</th>
                  <th>Exam ID</th>
                  <th>Tiêu đề</th>
                  <th>Phòng thi</th>
                  <th>Đăng ký lúc</th>
                  <th>Bắt đầu</th>
                  <th>Kết thúc</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {studentRegisteredExams.map((item) => {
                  const isDisabled = item.sessionStatus === 'DONE' || item.sessionStatus === 'BLOCKED'
                  const isLoading = takingExamId === Number(item.examId ?? item.exam?.id)
                  const currentExamId = Number(item.examId ?? item.exam?.id)
                  const hasAssignedRoom = roomExamId > 0 && currentExamId === roomExamId
                  
                  let buttonText = 'Vào thi'
                  let buttonTitle = ''
                  if (isLoading) {
                    buttonText = 'Đang vào thi...'
                  } else if (item.sessionStatus === 'DONE' || item.sessionStatus === 'BLOCKED') {
                    buttonText = 'Đã hoàn thành'
                    buttonTitle = 'Kỳ thi này đã hoàn thành'
                  } else if (item.sessionStatus === 'CHECKED_IN' || item.sessionStatus === 'IN_PROGRESS') {
                    buttonText = 'Tiếp tục thi'
                    buttonTitle = 'Tiếp tục phiên thi đang diễn ra'
                  }

                  return (
                    <tr key={item.id ?? `${item.examId}-${item.userId}`}>
                      <td>{item.id ?? '-'}</td>
                      <td>{item.examId ?? item.exam?.id ?? '-'}</td>
                      <td>{item.exam?.title || '-'}</td>
                      <td>
                        {item.roomInfo?.roomId
                          ? `${item.roomInfo.roomCode || item.roomInfo.roomId || '-'}${item.roomInfo.seatNumber != null ? ` · Ghế ${item.roomInfo.seatNumber}` : ''}`
                          : '-'}
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
                          title={buttonTitle}
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
