const STYLE_ID = 'app-confirm-dialog-style'

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .app-confirm-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 16px;
    }

    .app-confirm-dialog {
      width: min(420px, 100%);
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #dbe4f0;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.22);
      padding: 18px;
      display: grid;
      gap: 12px;
      font-family: 'Be Vietnam Pro', 'Segoe UI', sans-serif;
    }

    .app-confirm-title {
      margin: 0;
      font-size: 18px;
      line-height: 1.3;
      color: #0f172a;
      font-weight: 700;
    }

    .app-confirm-message {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
      color: #334155;
      white-space: pre-wrap;
    }

    .app-confirm-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .app-confirm-btn {
      border: 1px solid transparent;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .app-confirm-btn.cancel {
      background: #f1f5f9;
      color: #1e293b;
      border-color: #d5dce5;
    }

    .app-confirm-btn.cancel:hover {
      background: #e2e8f0;
    }

    .app-confirm-btn.confirm {
      background: #0d6efd;
      color: #ffffff;
    }

    .app-confirm-btn.confirm:hover {
      background: #0a58ca;
    }

    .app-confirm-btn.confirm.danger {
      background: #dc2626;
    }

    .app-confirm-btn.confirm.danger:hover {
      background: #b91c1c;
    }
  `

  document.head.appendChild(style)
}

export function showConfirmDialog(message, options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(false)
  }

  const {
    title = 'Xac nhan thao tac',
    confirmText = 'Dong y',
    cancelText = 'Huy',
    danger = true,
    closeOnBackdrop = false,
  } = options

  ensureStyles()

  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.className = 'app-confirm-overlay'

    const dialog = document.createElement('div')
    dialog.className = 'app-confirm-dialog'
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-modal', 'true')

    const titleEl = document.createElement('h3')
    titleEl.className = 'app-confirm-title'
    titleEl.textContent = String(title)

    const messageEl = document.createElement('p')
    messageEl.className = 'app-confirm-message'
    messageEl.textContent = String(message)

    const actions = document.createElement('div')
    actions.className = 'app-confirm-actions'

    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.className = 'app-confirm-btn cancel'
    cancelBtn.textContent = String(cancelText)

    const confirmBtn = document.createElement('button')
    confirmBtn.type = 'button'
    confirmBtn.className = `app-confirm-btn confirm${danger ? ' danger' : ''}`
    confirmBtn.textContent = String(confirmText)

    actions.appendChild(cancelBtn)
    actions.appendChild(confirmBtn)
    dialog.appendChild(titleEl)
    dialog.appendChild(messageEl)
    dialog.appendChild(actions)
    overlay.appendChild(dialog)
    document.body.appendChild(overlay)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const cleanup = () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      overlay.remove()
    }

    const finish = (value) => {
      cleanup()
      resolve(value)
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        finish(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)

    cancelBtn.addEventListener('click', () => finish(false))
    confirmBtn.addEventListener('click', () => finish(true))

    if (closeOnBackdrop) {
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
          finish(false)
        }
      })
    }

    confirmBtn.focus()
  })
}
