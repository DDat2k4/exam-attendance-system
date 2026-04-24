import React from 'react'

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      message: '',
    }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Unexpected application error',
    }
  }

  componentDidCatch(error, errorInfo) {
    // Keep the full stack in console for debugging.
    console.error('App crashed:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '20px', background: '#f7f9ff' }}>
          <div style={{ maxWidth: '680px', width: '100%', background: '#fff', border: '1px solid #dbe2ff', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ marginTop: 0, color: '#243577' }}>Ứng dụng gặp lỗi</h2>
            <p style={{ color: '#5d6ea1' }}>Không thể render trang hiện tại. Bạn có thể tải lại hoặc gửi lỗi này để mình fix nhanh.</p>
            <pre style={{ background: '#f5f7ff', border: '1px solid #e2e8ff', borderRadius: '8px', padding: '12px', color: '#2e4288', whiteSpace: 'pre-wrap' }}>
              {this.state.message}
            </pre>
            <button type="button" onClick={this.handleReload} style={{ border: 0, borderRadius: '8px', padding: '10px 14px', background: '#3152d8', color: '#fff', cursor: 'pointer' }}>
              Tải lại trang
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
