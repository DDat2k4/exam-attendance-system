export default function VerifySection({
  handleVerifyCccd,
  handleReadCccd,
  readingCccd,
  canVerify,
  verifyingCccd,
  cccdInfo,
  formatLocalDate,
  cccdFaceImageSrc,
}) {
  return (
    <section className="panel">
      <h2>Xác thực vào phòng</h2>

      <div className="verify-grid">
        <form className="verify-form" onSubmit={handleVerifyCccd}>
          <h3>Xác thực CCCD</h3>
          <p>Hệ thống sẽ đọc CCCD theo tài khoản đang đăng nhập và tự động xác thực.</p>

          <div className="inline-actions">
            <button className="secondary" type="button" onClick={handleReadCccd} disabled={readingCccd || !canVerify}>
              {readingCccd ? 'Đang đọc...' : 'Đọc thông tin CCCD'}
            </button>
            <button className="primary" type="submit" disabled={verifyingCccd || !canVerify}>
              {verifyingCccd ? 'Đang xác thực...' : 'Xác thực CCCD'}
            </button>
          </div>

          {cccdInfo && (
            <div className="cccd-info">
              <h4>Thông tin CCCD</h4>
              <div className="cccd-content">
                <div className="cccd-info-grid">
                  <p><strong>Số CCCD(9 số cuối):</strong> {cccdInfo.citizenId || '-'}</p>
                  <p><strong>Họ tên:</strong> {cccdInfo.fullName || '-'}</p>
                  <p><strong>Ngày sinh:</strong> {formatLocalDate(cccdInfo.birthDate)}</p>
                  <p><strong>Hạn sử dụng:</strong> {formatLocalDate(cccdInfo.expiry)}</p>
                </div>
                {cccdFaceImageSrc ? (
                  <div className="cccd-image-frame">
                    <img
                      className="captured-preview cccd-face-image"
                      src={cccdFaceImageSrc}
                      alt="CCCD face"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </form>
      </div>
    </section>
  )
}
