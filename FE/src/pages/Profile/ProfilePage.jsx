import { useEffect, useState } from 'react'
import { createUserProfile, getMyUserProfile, updateUserProfile } from '../../api/userProfileApi'
import { useAuth } from '../../context/AuthContext'
import './ProfilePage.css'

export default function ProfilePage() {
  const { user } = useAuth()
  const currentUserId = user?.id ?? user?.userId ?? null
  const normalizedUserId = currentUserId === null || currentUserId === undefined ? null : Number(currentUserId)
  const [profile, setProfile] = useState(null)
  const [profileRefreshNonce, setProfileRefreshNonce] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refreshProfile = async () => {
    const p = await getMyUserProfile({ force: true })
    const nextProfile = p ? { ...p } : null
    setProfile(nextProfile)
    setProfileRefreshNonce((value) => value + 1)
    return nextProfile
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const p = await refreshProfile()
        if (!cancelled && p === null) setProfile(null)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Không thể tải thông tin.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [user?.id, user?.userId, user?.username])

  const formatGender = (g) => {
    if (g === 1) return 'Nam'
    if (g === 2) return 'Nữ'
    if (g === 0) return 'Khác/Không xác định'
    return '-'
  }

  const [editing, setEditing] = useState(false)
  const [formState, setFormState] = useState({ name: '', citizenId: '', gender: '', birthDate: '' })
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')


  useEffect(() => {
    if (profile) {
      setFormState({
        name: profile.name || '',
        citizenId: profile.citizenId || '',
        gender: profile.gender ?? '',
        birthDate: profile.birthDate || '',
      })
    }
  }, [profile])

  const handleField = (e) => {
    const { name, value } = e.target
    setFormState((p) => ({ ...p, [name]: value }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaveMessage('')

    const citizenId = String(formState.citizenId || '').trim()
    if (!/^\d{12}$/.test(citizenId)) {
      setSaveMessage('CCCD phải gồm đúng 12 chữ số.')
      return
    }

    try {
      setSaveLoading(true)
      const payload = {
        ...(normalizedUserId !== null && Number.isFinite(normalizedUserId)
          ? { userId: normalizedUserId }
          : {}),
        name: formState.name,
        citizenId,
        gender: formState.gender === '' ? null : Number(formState.gender),
        birthDate: formState.birthDate || null,
      }

      if (profile?.id) {
        await updateUserProfile(profile.id, payload)
        setSaveMessage('Cập nhật hồ sơ thành công.')
      } else {
        await createUserProfile(payload)
        setSaveMessage('Tạo hồ sơ thành công. Đang tải lại thông tin hồ sơ...')
      }

      await refreshProfile()
      setEditing(false)
    } catch (err) {
      setSaveMessage(err.message || (profile?.id ? 'Không thể cập nhật hồ sơ.' : 'Không thể tạo hồ sơ.'))
    } finally {
      setSaveLoading(false)
    }
  }

  return (
    <div className="profile-page">
      <div className="page-card">
        <h2 className="force-black-title" style={{ color: '#000000', opacity: 1, fontWeight: 800 }}>Thông tin cá nhân</h2>
      {loading && <p>Đang tải...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && (
        <div key={profileRefreshNonce} className="profile-grid">
          <div>
            <p className="label">Họ tên</p>
            <p className="value">{profile?.name || user?.username || '-'}</p>
          </div>
          <div>
            <p className="label">CCCD</p>
            <p className="value">{profile?.citizenId || '-'}</p>
          </div>
          <div>
            <p className="label">Giới tính</p>
            <p className="value">{formatGender(profile?.gender)}</p>
          </div>
          <div>
            <p className="label">Ngày sinh</p>
            <p className="value">{profile?.birthDate || '-'}</p>
          </div>
          <div hidden style={{ display: 'none' }}>
          </div>
        </div>
      )}

        <div className="profile-actions">
          <button className="btn primary floating-center" onClick={() => setEditing(true)}>Cập nhật hồ sơ</button>
        </div>

        {editing && (
          <div className="proctor-room-modal-overlay" onClick={() => setEditing(false)} role="presentation">
            <div className="assign-room-modal profile-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <div className="assign-room-modal__header">
                <div>
                  <h3>Cập nhật hồ sơ</h3>
                  <p>Nhập thông tin hồ sơ và lưu thay đổi để cập nhật.</p>
                </div>
                <button type="button" className="modal-close-btn" onClick={() => setEditing(false)} aria-label="Đóng">×</button>
              </div>

              <form className="assign-room-form" onSubmit={handleSave}>
                <div className="profile-popover__grid">
                  <div>
                    <label htmlFor="name">Tên</label>
                    <input id="name" name="name" placeholder="Họ tên" value={formState.name} onChange={handleField} />
                  </div>
                  <div>
                    <label htmlFor="citizenId">CCCD</label>
                    <input id="citizenId" name="citizenId" placeholder="CCCD" value={formState.citizenId} onChange={handleField} />
                  </div>
                </div>

                <div className="profile-popover__grid">
                  <div>
                    <label htmlFor="gender">Giới tính</label>
                    <select id="gender" name="gender" value={formState.gender ?? ''} onChange={handleField}>
                      <option value="">-- Giới tính --</option>
                      <option value="1">Nam</option>
                      <option value="2">Nữ</option>
                      <option value="0">Khác/Không xác định</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="birthDate">Ngày sinh</label>
                    <input id="birthDate" name="birthDate" type="date" value={formState.birthDate || ''} onChange={handleField} />
                  </div>
                </div>

                <div className="assign-room-actions" style={{ marginTop: 8 }}>
                  <button type="button" className="secondary" onClick={() => { setEditing(false); setSaveMessage('') }}>Hủy</button>
                  <button type="submit" className="primary">{saveLoading ? 'Đang lưu...' : 'Lưu'}</button>
                </div>

                {saveMessage && <div style={{ marginTop: 8 }}><p className={saveMessage.includes('thành công') ? 'form-success' : 'form-error'}>{saveMessage}</p></div>}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
