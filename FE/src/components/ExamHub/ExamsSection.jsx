export default function ExamsSection({
  editingExamId,
  examForm,
  onExamChange,
  handleUpdateExam,
  handleCreateExam,
  submittingExam,
  updatingExam,
  canCreateExams,
  cancelEditExam,
  canViewExams,
  loading,
  exams,
  formatDateTime,
  startEditExam,
  handleDeleteExam,
  processingExamId,
  examKeyword,
  setExamKeyword,
  handleSearchExams,
  examPage,
  examTotalPages,
  examTotalElements,
  handlePrevPage,
  handleNextPage,
}) {
  return (
    <>
      {canCreateExams && (
        <section className="panel">
          <h2>{editingExamId ? `Cập nhật kỳ thi #${editingExamId}` : 'Tạo kỳ thi'}</h2>
          <form className="grid-form" onSubmit={editingExamId ? handleUpdateExam : handleCreateExam}>
            <label htmlFor="title">Tên kỳ thi</label>
            <input id="title" name="title" value={examForm.title} onChange={onExamChange} placeholder="VD: Midterm 2026" />

            <label htmlFor="description">Mô tả</label>
            <textarea
              id="description"
              name="description"
              value={examForm.description}
              onChange={onExamChange}
              placeholder="Mô tả kỳ thi"
            />

            <label htmlFor="startTime">Thời gian bắt đầu</label>
            <input id="startTime" type="datetime-local" name="startTime" value={examForm.startTime} onChange={onExamChange} />

            <label htmlFor="endTime">Thời gian kết thúc</label>
            <input id="endTime" type="datetime-local" name="endTime" value={examForm.endTime} onChange={onExamChange} />

            <button className="primary" type="submit" disabled={(submittingExam || updatingExam) || !canCreateExams}>
              {editingExamId ? (updatingExam ? 'Đang cập nhật...' : 'Cập nhật kỳ thi') : (submittingExam ? 'Đang tạo...' : 'Tạo kỳ thi')}
            </button>
            {editingExamId && (
              <button className="secondary" type="button" onClick={cancelEditExam}>
                Hủy sửa
              </button>
            )}
          </form>
        </section>
      )}

      {canViewExams && (
        <section className="panel">
          <h2>Danh sách kỳ thi</h2>
          <form className="exam-filter-bar" onSubmit={handleSearchExams}>
            <div className="exam-filter-field">
              <span className="exam-filter-icon">⌕</span>
              <input
                className="exam-filter-input"
                value={examKeyword}
                onChange={(e) => setExamKeyword(e.target.value)}
                placeholder="Tìm theo tên kỳ thi"
                aria-label="Tìm theo tên kỳ thi"
              />
            </div>
            <button type="submit" className="tiny-btn exam-filter-button" disabled={loading}>
              Tìm kiếm
            </button>
          </form>

          {loading ? (
            <p>Đang tải dữ liệu...</p>
          ) : exams.length === 0 ? (
            <p>Chưa có kỳ thi nào.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tiêu đề</th>
                    <th>Người tạo</th>
                    <th>Bắt đầu</th>
                    <th>Kết thúc</th>
                    <th>Số phòng</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => (
                    <tr key={exam.id}>
                      <td>{exam.id}</td>
                      <td>{exam.title || '-'}</td>
                      <td>{exam.createdByUserId ?? exam.createdByUsername ?? '-'}</td>
                      <td>{formatDateTime(exam.startTime)}</td>
                      <td>{formatDateTime(exam.endTime)}</td>
                      <td>{Array.isArray(exam.rooms) ? exam.rooms.length : 0}</td>
                      <td>
                        <div className="table-actions">
                          {canCreateExams && (
                            <>
                              <button type="button" className="tiny-btn" onClick={() => startEditExam(exam)}>
                                Sửa
                              </button>
                              <button
                                type="button"
                                className="tiny-btn danger"
                                onClick={() => handleDeleteExam(exam.id)}
                                disabled={processingExamId === exam.id}
                              >
                                Xóa
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="registration-pagination" style={{ marginTop: '12px' }}>
            <span>Trang {examPage} / {examTotalPages || 1} • Tổng {examTotalElements}</span>
            <div className="inline-actions">
              <button
                type="button"
                className="tiny-btn"
                onClick={handlePrevPage}
                disabled={loading || examPage <= 1}
              >
                Trước
              </button>
              <button
                type="button"
                className="tiny-btn"
                onClick={handleNextPage}
                disabled={loading || examPage >= (examTotalPages || 1)}
              >
                Sau
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
