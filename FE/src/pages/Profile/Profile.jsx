import { useEffect, useMemo, useState } from 'react'
import {
  createUserProfile,
  deleteUserProfile,
  getUserProfile,
  getUserProfiles,
  updateUserProfile,
} from '../../api/userProfileApi'
import { showConfirmDialog } from '../../utils/confirmDialog'
import { getUserFromToken } from '../../utils/jwt'
import './Profile.css'

const INITIAL_FORM = {
  name: '',
  gender: '',
  birthDate: '',
  citizenId: '',
}

const PERSONAL_LOOKUP_PAGE_SIZE = 50

const toPayload = (form, userIdValue) => {
  const userId = Number(userIdValue)
  const gender = Number(form.gender)

  return {
    userId: Number.isNaN(userId) ? null : userId,
    name: form.name.trim(),
    gender: Number.isNaN(gender) ? null : gender,
    birthDate: form.birthDate || null,
    citizenId: form.citizenId.trim() || null,
  }
}

export default function Profile() {
  const [profiles, setProfiles] = useState([])
  const [form, setForm] = useState(INITIAL_FORM)
  const [personalProfile, setPersonalProfile] = useState(null)
  const [loadingPersonal, setLoadingPersonal] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingUserId, setEditingUserId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / size)), [size, total])

  const mapItemToForm = (item) => ({
    name: item?.name ?? '',
    gender: item?.gender ?? '',
    birthDate: item?.birthDate ?? '',
    citizenId: item?.citizenId ?? '',
  })

  const fetchPersonalProfile = async () => {
    const tokenUser = getUserFromToken()
    const userIdRaw = tokenUser?.id ?? tokenUser?.userId ?? localStorage.getItem('userId')
    const userId = Number(userIdRaw)
    const profileIdRaw = tokenUser?.profileId ?? localStorage.getItem('profileId')
    const profileId = Number(profileIdRaw)

    try {
      setLoadingPersonal(true)
      let profile = null

      if (userId) {
        let lookupPage = 1
        let lookupTotalPages = 1

        while (!profile && lookupPage <= lookupTotalPages) {
          const pageResult = await getUserProfiles({ page: lookupPage, size: PERSONAL_LOOKUP_PAGE_SIZE })
          const items = Array.isArray(pageResult?.items) ? pageResult.items : []
          const matched = items.find((item) => Number(item?.userId) === userId)
          if (matched) {
            profile = matched
            break
          }

          const totalElements = Number(pageResult?.total ?? 0)
          lookupTotalPages = Math.max(1, Math.ceil(totalElements / PERSONAL_LOOKUP_PAGE_SIZE))
          lookupPage += 1
        }
      }

      // Fallback for legacy sessions that only persisted profileId.
      if (!profile && profileId) {
        try {
          profile = await getUserProfile(profileId)
        } catch (profileLookupErr) {
          if (profileLookupErr?.response?.status !== 404) {
            throw profileLookupErr
          }
        }
      }

      setPersonalProfile(profile ?? null)

      if (profile?.id) {
        localStorage.setItem('profileId', String(profile.id))
      }

      if (profile?.userId) {
        localStorage.setItem('userId', String(profile.userId))
      }
    } catch (err) {
      // For personal section, fallback to create mode instead of surfacing noisy errors.
      setPersonalProfile(null)
    } finally {
      setLoadingPersonal(false)
    }
  }

  const fetchProfiles = async () => {
    try {
      setLoading(true)
      setError('')
      const result = await getUserProfiles({ name: search, page, size })
      setProfiles(Array.isArray(result.items) ? result.items : [])
      setTotal(Number(result.total || 0))
      setPage(Number(result.page || page))
      setSize(Number(result.size || size))
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách profile.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfiles()
  }, [page, size, search])

  useEffect(() => {
    fetchPersonalProfile()
  }, [])

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const resetForm = () => {
    setEditingId(null)
    setEditingUserId(null)
    setForm(INITIAL_FORM)
  }

  const onSubmit = async (e) => {
    e.preventDefault()

    if (!form.name) {
      setError('Họ và tên là bắt buộc.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      const targetId = editingId ?? personalProfile?.id ?? null
      const userIdSource = editingUserId ?? personalProfile?.userId ?? localStorage.getItem('userId')
      const payload = toPayload(form, userIdSource)

      if (!payload.userId) {
        setError('Không tìm thấy userId hiện tại để tạo profile.')
        return
      }

      if (targetId) {
        await updateUserProfile(targetId, payload)
        setSuccess('Cập nhật profile thành công.')
      } else {
        await createUserProfile(payload)
        setSuccess('Thêm profile thành công.')
      }

      resetForm()
      await fetchPersonalProfile()
      await fetchProfiles()
    } catch (err) {
      setError(err.message || 'Không thể lưu profile.')
    } finally {
      setSubmitting(false)
    }
  }

  const onEdit = (item) => {
    setEditingId(item.id)
    setEditingUserId(item.userId)
    setForm(mapItemToForm(item))
    setSuccess('')
    setError('')
  }

  const onEditPersonal = () => {
    if (!personalProfile) return
    setEditingId(personalProfile.id)
    setEditingUserId(personalProfile.userId)
    setForm(mapItemToForm(personalProfile))
    setSuccess('')
    setError('')
  }

  const onDelete = async (id) => {
    const ok = await showConfirmDialog('Bạn chắc chắn muốn xóa profile này?', {
      title: 'Xác nhận xóa profile',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      danger: true,
    })
    if (!ok) return

    try {
      setError('')
      setSuccess('')
      await deleteUserProfile(id)
      setSuccess('Đã xóa profile.')
      await fetchPersonalProfile()
      await fetchProfiles()
    } catch (err) {
      setError(err.message || 'Không thể xóa profile.')
    }
  }

  const onSearch = (e) => {
    e.preventDefault()
    setPage(1)
    setSearch(keyword.trim())
  }

  const formatVerifiedAt = (value) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString('vi-VN')
  }

  const isEditing = editingId !== null

  return (
    <div className="profile-page">
      <section className="profile-card">
        <header>
          <p className="mini">Thông tin cá nhân</p>
          <h2>
            {personalProfile
              ? isEditing
                ? 'Cập nhật thông tin cá nhân'
                : 'Thông tin cá nhân'
              : isEditing
                ? 'Cập nhật thông tin cá nhân'
                : 'Thêm thông tin cá nhân'}
          </h2>
        </header>

        {loadingPersonal && !isEditing ? <p className="state">Đang tải profile cá nhân...</p> : null}

        {!loadingPersonal && personalProfile && !isEditing ? (
          <div className="personal-profile">
            <div className="personal-grid">
              <p><strong>Họ và tên:</strong> {personalProfile.name || '-'}</p>
              <p><strong>Căn cước công dân:</strong> {personalProfile.citizenId || '-'}</p>
              <p><strong>Giới tính:</strong> {personalProfile.gender === 1 ? 'Nam' : personalProfile.gender === 2 ? 'Nữ' : personalProfile.gender === 0 ? 'Khác/Không xác định' : '-'}</p>
              <p><strong>Ngày sinh:</strong> {personalProfile.birthDate || '-'}</p>
              <p><strong>Trạng thái xác minh:</strong> {personalProfile.isVerified === true ? 'Đã xác minh' : personalProfile.isVerified === false ? 'Chưa xác minh' : '-'}</p>
              <p><strong>Thời điểm xác minh:</strong> {formatVerifiedAt(personalProfile.verifiedAt)}</p>
            </div>
            <div className="form-actions">
              <button type="button" onClick={onEditPersonal}>Sửa profile cá nhân</button>
            </div>
          </div>
        ) : (
          <form className="profile-form" onSubmit={onSubmit}>
            <label>
              <span>Họ và tên *</span>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={onChange}
                placeholder="Nguyen Van A"
                required
              />
            </label>

            <label>
              <span>Căn cước công dân</span>
              <input
                type="text"
                name="citizenId"
                value={form.citizenId}
                onChange={onChange}
                placeholder="0123456789"
              />
            </label>

            <label>
              <span>Giới tính</span>
              <select name="gender" value={form.gender} onChange={onChange}>
                <option value="">-- Chọn giới tính --</option>
                <option value="1">Nam</option>
                <option value="2">Nữ</option>
                <option value="0">Khác/Không xác định</option>
              </select>
            </label>

            <label>
              <span>Ngày sinh</span>
              <input type="date" name="birthDate" value={form.birthDate} onChange={onChange} />
            </label>

            <div className="form-actions full-width">
              <button type="submit" disabled={submitting}>
                {submitting ? 'Đang lưu...' : isEditing ? 'Lưu cập nhật' : 'Thêm thông tin cá nhân'}
              </button>
              {isEditing ? (
                <button type="button" className="ghost" onClick={resetForm}>
                  Hủy sửa
                </button>
              ) : null}
            </div>
          </form>
        )}

        {error ? <p className="msg error">{error}</p> : null}
        {success ? <p className="msg success">{success}</p> : null}
      </section>

      <section className="profile-card">
        <header className="list-header">
          <div>
            <p className="mini">Hồ sơ người dùng</p>
            <h2>Danh sách profile</h2>
          </div>
          <form className="search-box" onSubmit={onSearch}>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tên"
            />
            <button type="submit">Tìm</button>
          </form>
        </header>

        {loading ? <p className="state">Đang tải profile...</p> : null}

        {!loading && profiles.length === 0 ? <p className="state">Chưa có profile nào.</p> : null}

        {!loading && profiles.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Mã người dùng</th>
                  <th>Họ và tên</th>
                  <th>Căn cước công dân</th>
                  <th>Giới tính</th>
                  <th>Ngày sinh</th>
                  <th>Trạng thái xác minh</th>
                  <th>Thời điểm xác minh</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.userId}</td>
                    <td>{item.name || '-'}</td>
                    <td>{item.citizenId || '-'}</td>
                    <td>{item.gender === 1 ? 'Nam' : item.gender === 2 ? 'Nữ' : item.gender === 0 ? 'Khác/Không xác định' : '-'}</td>
                    <td>{item.birthDate || '-'}</td>
                    <td>{item.isVerified === true ? 'Đã xác minh' : item.isVerified === false ? 'Chưa xác minh' : '-'}</td>
                    <td>{formatVerifiedAt(item.verifiedAt)}</td>
                    <td className="actions">
                      <button type="button" className="ghost" onClick={() => onEdit(item)}>
                        Sửa
                      </button>
                      <button type="button" className="danger" onClick={() => onDelete(item.id)}>
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <footer className="pager">
          <button type="button" className="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Trang trước
          </button>
          <span>
            Trang {page}/{totalPages} - Tổng: {total}
          </span>
          <button
            type="button"
            className="ghost"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Trang sau
          </button>
        </footer>
      </section>
    </div>
  )
}
