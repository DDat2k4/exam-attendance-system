import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  ImportIcon,
  PencilIcon,
  SearchIcon,
  TrashIcon,
} from '../ui/AppIcons'

export default function ExamsSection({
  editingExamId,
  examForm,
  onExamChange,
  handleUpdateExam,
  handleCreateExam,
  submittingExam,
  updatingExam,
  canCreateExams,
  canManageExams,
  showExamFormModal,
  closeExamFormModal,
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
  showImportModal,
  importTarget,
  importFile,
  submittingImport,
  importError,
  handleOpenImport,
  handleCloseImport,
  handleImportFileChange,
  handleImportSubmit,
}) {
  return (
    <>
      {canViewExams && (
        <section className="panel exam-list-panel">
          <h2>Danh sách kỳ thi</h2>
          <form className="exam-filter-bar" onSubmit={handleSearchExams}>
            <div className="exam-filter-field">
              <span className="exam-filter-icon"><SearchIcon size={14} /></span>
              <input
                className="exam-filter-input"
                value={examKeyword}
                onChange={(e) => setExamKeyword(e.target.value)}
                placeholder="Tìm theo tên kỳ thi, mã kỳ thi hoặc mã học kỳ"
                aria-label="Tìm theo tên kỳ thi, mã kỳ thi hoặc mã học kỳ"
              />
            </div>
            <button type="submit" className="tiny-btn exam-filter-button icon-only-btn" disabled={loading} aria-label="Tìm kiếm" title="Tìm kiếm">
              <SearchIcon />
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
                    <th>Mã môn thi</th>
                    <th>Mã học kỳ</th>
                    <th>Người tạo</th>
                    <th>Bắt đầu</th>
                    <th>Kết thúc</th>
                    <th>Số phòng</th>
                    {canManageExams ? <th>Thao tác</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => (
                    <tr key={exam.id}>
                      <td>{exam.id}</td>
                      <td>{exam.title || '-'}</td>
                      <td>{exam.examCode || '-'}</td>
                      <td>{exam.semester || '-'}</td>
                      <td>{exam.createdByUsername || exam.createdByUserId || '-'}</td>
                      <td>{formatDateTime(exam.startTime)}</td>
                      <td>{formatDateTime(exam.endTime)}</td>
                      <td>{Array.isArray(exam.rooms) ? exam.rooms.length : 0}</td>
                        {canManageExams ? (
                          <td>
                            <div className="table-actions">
                              {canCreateExams && (
                                <>
                                  <button
                                    type="button"
                                    className="tiny-btn icon-only-btn"
                                    onClick={() => handleOpenImport(exam.id, exam.title)}
                                    disabled={processingExamId === exam.id}
                                    aria-label={`Import dữ liệu cho kỳ thi ${exam.id}`}
                                    title="Import dữ liệu"
                                  >
                                    <ImportIcon />
                                  </button>

                                  <button type="button" className="tiny-btn icon-only-btn" onClick={() => startEditExam(exam)} aria-label={`Sửa kỳ thi ${exam.id}`} title="Sửa kỳ thi">
                                    <PencilIcon />
                                  </button>
                                  <button
                                    type="button"
                                    className="tiny-btn danger icon-only-btn"
                                    onClick={() => handleDeleteExam(exam.id, exam.title)}
                                    disabled={processingExamId === exam.id}
                                    aria-label={`Xóa kỳ thi ${exam.id}`}
                                    title="Xóa kỳ thi"
                                  >
                                    <TrashIcon />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        ) : null}
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
                className="tiny-btn icon-only-btn"
                onClick={handlePrevPage}
                disabled={loading || examPage <= 1}
                aria-label="Trang trước"
                title="Trang trước"
              >
                <ChevronLeftIcon />
              </button>
              <button
                type="button"
                className="tiny-btn icon-only-btn"
                onClick={handleNextPage}
                disabled={loading || examPage >= (examTotalPages || 1)}
                aria-label="Trang sau"
                title="Trang sau"
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>

          {canCreateExams && showExamFormModal && (
            <div className="proctor-room-modal-overlay" onClick={closeExamFormModal} role="presentation">
              <div className="assign-room-modal exam-form-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="assign-room-modal__header">
                  <div>
                    <h3>{editingExamId ? `Cập nhật kỳ thi ${editingExamId}` : 'Tạo kỳ thi mới'}</h3>
                    <p>Nhập thông tin kỳ thi và lưu thay đổi để cập nhật danh sách.</p>
                  </div>
                  <button type="button" className="modal-close-btn" onClick={closeExamFormModal} aria-label="Đóng">
                    <CloseIcon />
                  </button>
                </div>

                <form className="grid-form exam-form-grid" onSubmit={editingExamId ? handleUpdateExam : handleCreateExam}>
                  <div className="exam-field exam-field--full">
                    <label htmlFor="title">Tên kỳ thi</label>
                    <input id="title" name="title" value={examForm.title} onChange={onExamChange} placeholder="VD: Midterm 2026" />
                  </div>

                  <div className="exam-field-row">
                    <div className="exam-field exam-field--half">
                      <label htmlFor="examCode">Mã môn thi</label>
                      <input id="examCode" name="examCode" value={examForm.examCode} onChange={onExamChange} placeholder="VD: IT3200" />
                    </div>

                    <div className="exam-field exam-field--half">
                      <label htmlFor="semester">Mã học kỳ</label>
                      <input id="semester" name="semester" value={examForm.semester} onChange={onExamChange} placeholder="VD: 20251" />
                    </div>
                  </div>

                  <div className="exam-field-row">
                    <div className="exam-field exam-field--half">
                      <label htmlFor="startTime">Thời gian bắt đầu</label>
                      <input id="startTime" type="datetime-local" name="startTime" value={examForm.startTime} onChange={onExamChange} />
                    </div>

                    <div className="exam-field exam-field--half">
                      <label htmlFor="endTime">Thời gian kết thúc</label>
                      <input id="endTime" type="datetime-local" name="endTime" value={examForm.endTime} onChange={onExamChange} />
                    </div>
                  </div>

                  <div className="exam-field exam-field--full">
                    <label htmlFor="description">Mô tả</label>
                    <textarea
                      id="description"
                      name="description"
                      value={examForm.description}
                      onChange={onExamChange}
                      placeholder="Mô tả kỳ thi"
                    />
                  </div>

                  <div className="inline-actions exam-form-actions">
                    <button className="secondary" type="button" onClick={closeExamFormModal}>
                      Hủy
                    </button>
                    <button className="primary" type="submit" disabled={(submittingExam || updatingExam) || !canCreateExams}>
                      {editingExamId ? (updatingExam ? 'Đang cập nhật...' : 'Cập nhật kỳ thi') : (submittingExam ? 'Đang tạo...' : 'Tạo kỳ thi')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showImportModal && importTarget && (
            <div
              className="proctor-room-modal-overlay"
              onClick={handleCloseImport}

              role="presentation"
            >
              <div className="assign-room-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="assign-room-modal__header">
                  <h3>Import dữ liệu từ Excel</h3>
                  <button type="button" className="modal-close-btn" onClick={handleCloseImport} aria-label="Đóng import">
                    <CloseIcon />
                  </button>
                </div>

                <form onSubmit={handleImportSubmit} className="assign-room-modal__body">
                  {importError && <div className="feedback error" style={{ marginBottom: '12px' }}>{importError}</div>}

                  <div style={{ marginBottom: '12px' }}>
                    <label htmlFor="import-file-input" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2f3f82', fontSize: '14px' }}>
                      Chọn file Excel
                    </label>
                    <input
                      id="import-file-input"
                      type="file"
                      accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                      onChange={handleImportFileChange}
                      disabled={submittingImport}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 12px',
                        border: '1.5px solid #d1dff8',
                        borderRadius: '8px',
                        fontSize: '13px',
                        backgroundColor: '#fafbff',
                        color: '#243577',
                        fontFamily: 'inherit',
                        cursor: submittingImport ? 'not-allowed' : 'pointer',
                        opacity: submittingImport ? 0.6 : 1,
                        transition: 'all 0.2s ease',
                      }}
                    />
                    {importFile && (
                      <small style={{ display: 'block', marginTop: '6px', color: '#0f9d7a', fontWeight: '500', fontSize: '12px' }}>
                        ✓ {importFile.name}
                      </small>
                    )}
                  </div>

                  <div style={{ fontSize: '13px', color: '#5d6ea1', marginBottom: '16px' }}>
                    <p style={{ margin: '0 0 8px', fontWeight: '500' }}>
                      Kỳ thi: <strong style={{ color: '#243577' }}>{importTarget.examTitle}</strong>
                    </p>
                    <p style={{ margin: '0', fontSize: '12px', color: '#999' }}>
                      File Excel sẽ được import vào kỳ thi {importTarget.examTitle}
                    </p>
                  </div>

                  <div className="import-modal-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={handleCloseImport}
                      disabled={submittingImport}
                    >
                      <CloseIcon size={16} />
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="primary"
                      disabled={!importFile || submittingImport}
                    >
                      <ImportIcon size={16} />
                      {submittingImport ? 'Đang import...' : 'Import'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  )
}
