import { useState } from 'react'
import { readCccd, verifyCccd } from '../../api/verificationApi'
import VerifySection from '../../components/ExamHub/VerifySection'
import { useAuth } from '../../context/AuthContext'
import { canAccess } from '../../utils/rbac'
import '../../components/ExamHub/ExamHub.css'

export default function VerificationPage() {
  const { user } = useAuth()
  const [verifyingCccd, setVerifyingCccd] = useState(false)
  const [readingCccd, setReadingCccd] = useState(false)
  const [cccdInfo, setCccdInfo] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const canVerify = canAccess(user, {
    allowRoles: ['STUDENT'],
  })

  const formatLocalDate = (raw) => {
    if (!raw) return '-'
    if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [year, month, day] = raw.split('-')
      return `${day}/${month}/${year}`
    }

    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return raw
    return date.toLocaleDateString('vi-VN')
  }

  const getCccdFaceImageSrc = (rawValue) => {
    if (!rawValue || typeof rawValue !== 'string') return null
    const value = rawValue.trim()
    if (!value) return null

    if (value.startsWith('data:image/')) return value
    if (value.startsWith('http://') || value.startsWith('https://')) return value

    return `data:image/jpeg;base64,${value}`
  }

  const handleVerifyCccd = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      setVerifyingCccd(true)
      const data = await verifyCccd()
      setCccdInfo(data ?? null)
      setSuccess('Xác thực CCCD thành công.')
    } catch (err) {
      setError(err.message || 'Không thể xác thực CCCD.')
    } finally {
      setVerifyingCccd(false)
    }
  }

  const handleReadCccd = async () => {
    setError('')
    setSuccess('')

    try {
      setReadingCccd(true)
      const data = await readCccd()
      setCccdInfo(data ?? null)
      setSuccess('Đọc thông tin CCCD thành công.')
    } catch (err) {
      setError(err.message || 'Không thể đọc thông tin CCCD.')
    } finally {
      setReadingCccd(false)
    }
  }

  const cccdFaceImageSrc = getCccdFaceImageSrc(cccdInfo?.faceImage || cccdInfo?.FaceImage)

  return (
    <div className="exam-page">
      <header className="exam-header">
        <div>
          <h1>Xác thực Căn cước công dân</h1>
          <p className="exam-subtitle">Đọc và xác thực thông tin từ thẻ căn cước công dân kỳ hạn</p>
        </div>
      </header>

      {error && <p className="feedback error">{error}</p>}
      {success && <p className="feedback success">{success}</p>}

      <VerifySection
        handleVerifyCccd={handleVerifyCccd}
        handleReadCccd={handleReadCccd}
        readingCccd={readingCccd}
        canVerify={canVerify}
        verifyingCccd={verifyingCccd}
        cccdInfo={cccdInfo}
        formatLocalDate={formatLocalDate}
        cccdFaceImageSrc={cccdFaceImageSrc}
      />
    </div>
  )
}
