import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import LoginPage    from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import SetupPage    from '@/pages/SetupPage'
import AdminPage    from '@/pages/AdminPage'
import MenuPage     from '@/pages/MenuPage'
import LandingPage  from '@/pages/LandingPage'
import './index.css'

const center: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', minHeight: '100vh', gap: 12,
  fontFamily: 'Georgia,serif', color: '#94a3b8',
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { status, refreshSession } = useAuth()

  // Still loading — show spinner
  if (status === 'loading') return (
    <div style={center}>
      <div style={{ fontSize: 40 }}>🍜</div>
      <p style={{ fontSize: 16 }}>Cargando tu panel…</p>
    </div>
  )

  // Backend unreachable — don't redirect, let user retry
  if (status === 'error') return (
    <div style={center}>
      <div style={{ fontSize: 48 }}>⚠️</div>
      <p style={{ fontSize: 16, fontWeight: 700, color: '#ef4444' }}>
        No se pudo conectar al servidor
      </p>
      <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', maxWidth: 360 }}>
        El frontend está intentando conectarse a:<br/>
        <strong style={{ color: '#1e293b', wordBreak: 'break-all' }}>
          {import.meta.env.VITE_API_URL
            ? `${import.meta.env.VITE_API_URL}/api/restaurante/me`
            : 'http://localhost:3001/api/restaurante/me (proxy)'}
        </strong>
      </p>
      <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', maxWidth: 360, marginTop: 4 }}>
        Abre F12 → Console para ver el error exacto
      </p>
      <button
        onClick={() => refreshSession()}
        style={{ marginTop: 12, padding: '10px 24px', borderRadius: 12, border: 'none',
          background: 'linear-gradient(135deg,#f97316,#ef4444)', color: '#fff',
          fontWeight: 800, cursor: 'pointer', fontSize: 15 }}
      >
        🔄 Reintentar
      </button>
    </div>
  )

  // Not logged in
  if (status === 'unauthenticated') return <Navigate to="/login" replace />

  // Logged in but no restaurante → first-time setup
  if (status === 'no-restaurante') return <Navigate to="/setup" replace />

  // All good
  return <>{children}</>
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return null
  if (status === 'ready') return <Navigate to="/admin" replace />
  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"           element={<LandingPage />} />
          <Route path="/login"      element={<AuthRoute><LoginPage /></AuthRoute>} />
          <Route path="/register"   element={<AuthRoute><RegisterPage /></AuthRoute>} />
          <Route path="/setup"      element={<SetupPage />} />
          <Route path="/admin/*"    element={<PrivateRoute><AdminPage /></PrivateRoute>} />
          <Route path="/menu/:slug" element={<MenuPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
)
