import { useState } from 'react'
import { changePassword, logout } from '../../api/auth'
import './ProfilePage.css'

export default function ChangePasswordPage() {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
  }

  const confirmMismatch = form.confirmPassword !== '' && form.newPassword !== form.confirmPassword

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.oldPassword || !form.newPassword || !form.confirmPassword) {
      setError('Vui lòng nhập đầy đủ trường.')
      return
    }
    if (form.newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.')
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }

    try {
      setLoading(true)
      await changePassword(form.oldPassword, form.newPassword)
      setSuccess('Đổi mật khẩu thành công. Bạn sẽ được đăng xuất để đăng nhập lại.')
      setForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
      // force logout so user must re-authenticate with new password
      try {
        await logout()
      } catch (e) {
        // if logout fails locally, still redirect to login
        window.location.href = '/login'
      }
    } catch (err) {
      setError(err.message || 'Không thể đổi mật khẩu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="change-password-page">
      <div className="page-card">
        <form className="change-password-form" onSubmit={handleSubmit}>
          <div className="form-body">
            <h2 className="force-black-title" style={{ color: '#000000', opacity: 1, fontWeight: 800 }}>Đổi mật khẩu</h2>
          <label className="input-with-icon">
            <input name="oldPassword" type={showOld ? 'text' : 'password'} placeholder="Mật khẩu cũ" value={form.oldPassword} onChange={handleChange} />
            <button type="button" className="toggle-visibility" aria-pressed={showOld} onClick={() => setShowOld((s) => !s)} aria-label={showOld ? 'Ẩn mật khẩu cũ' : 'Hiện mật khẩu cũ'}>
              {showOld ? (
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M3 3l18 18" stroke="#111827" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10.58 10.58a2 2 0 1 0 2.84 2.84" stroke="#111827" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="#111827" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="3" stroke="#111827" strokeWidth="1.4" />
                </svg>
              )}
            </button>
          </label>

          <label className="input-with-icon">
            <input name="newPassword" type={showNew ? 'text' : 'password'} placeholder="Mật khẩu mới" value={form.newPassword} onChange={handleChange} />
            <button type="button" className="toggle-visibility" aria-pressed={showNew} onClick={() => setShowNew((s) => !s)} aria-label={showNew ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}>
              {showNew ? (
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M3 3l18 18" stroke="#111827" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10.58 10.58a2 2 0 1 0 2.84 2.84" stroke="#111827" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="#111827" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="3" stroke="#111827" strokeWidth="1.4" />
                </svg>
              )}
            </button>
          </label>

          <label className="input-with-icon">
            <input name="confirmPassword" type={showConfirm ? 'text' : 'password'} placeholder="Xác nhận mật khẩu" value={form.confirmPassword} onChange={handleChange} />
            <button type="button" className="toggle-visibility" aria-pressed={showConfirm} onClick={() => setShowConfirm((s) => !s)} aria-label={showConfirm ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}>
              {showConfirm ? (
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M3 3l18 18" stroke="#111827" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10.58 10.58a2 2 0 1 0 2.84 2.84" stroke="#111827" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="#111827" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="3" stroke="#111827" strokeWidth="1.4" />
                </svg>
              )}
            </button>
          </label>
          {confirmMismatch && <p className="error">Mật khẩu xác nhận không khớp.</p>}

          <button className="btn primary floating-submit" type="submit" disabled={loading || confirmMismatch}>{loading ? 'Đang đổi...' : 'Đổi mật khẩu'}</button>
          </div>

          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
        </form>
      </div>
    </div>
  )
}
