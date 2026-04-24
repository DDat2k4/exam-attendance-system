import { Link } from 'react-router-dom'
import './Forbidden.css'

export default function Forbidden() {
  return (
    <section className="forbidden-page">
      <p className="forbidden-code">403</p>
      <h1>Khu vực này hiện chưa sẵn sàng cho tài khoản của bạn</h1>
      <p>
        Bạn vui lòng quay lại trang tổng quan hoặc liên hệ người quản trị để được hỗ trợ thêm.
      </p>
      <Link to="/home">Quay lai Dashboard</Link>
    </section>
  )
}
