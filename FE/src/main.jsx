import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { initAuthInterceptors } from './api/auth'
import AppErrorBoundary from './components/ui/AppErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import App from './App.jsx'

initAuthInterceptors()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
