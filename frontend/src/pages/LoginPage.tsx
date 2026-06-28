import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authSignIn } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

export default function LoginPage() {
  const navigate = useNavigate()
  const { refreshSession } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error: err } = await authSignIn(email, password)
    if (err) { setError(err.message); setLoading(false); return }
    await refreshSession()
    navigate('/admin')
  }

  const inp: React.CSSProperties = { width:'100%', padding:'12px 14px', borderRadius:8, border:'1px solid #d1d5db', fontSize:14, boxSizing:'border-box', outline:'none', fontFamily:font }

  return (
    <div style={{ minHeight:'100vh', background:'#f9fafb', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:font, padding:16 }}>
      <div style={{ width:'100%', maxWidth:400 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:'0 0 6px', color:'#1f2937' }}>Iniciar Sesión</h1>
          <p style={{ color:'#6b7280', fontSize:14, margin:0 }}>Accede a tu panel de administración</p>
        </div>
        <div style={{ background:'#fff', borderRadius:12, padding:32, border:'1px solid #e5e7eb', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6, color:'#374151' }}>Email</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" style={inp} />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6, color:'#374151' }}>Contraseña</label>
              <div style={{ position:'relative' }}>
                <input type={showPass ? 'text' : 'password'} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Tu contraseña" style={{ ...inp, paddingRight:42 }} />
                <button type="button" onClick={()=>setShowPass(!showPass)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#6b7280', padding:4, fontFamily:font }}>{showPass ? 'Ocultar' : 'Mostrar'}</button>
              </div>
            </div>
            <div style={{ textAlign:'right', marginBottom:16 }}>
              <Link to="/forgot-password" style={{ fontSize:13, color:'#e91e63', textDecoration:'none', fontWeight:500 }}>¿Olvidaste tu contrasena?</Link>
            </div>
            {error && <p style={{ color:'#dc2626', fontSize:13, marginBottom:12, fontWeight:500, background:'#fef2f2', padding:'8px 12px', borderRadius:6, border:'1px solid #fecaca' }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ width:'100%', padding:'12px 0', borderRadius:8, border:'none', background:'#e91e63', color:'#fff', fontWeight:600, fontSize:15, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1, fontFamily:font }}>
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
        <p style={{ textAlign:'center', marginTop:20, fontSize:14, color:'#6b7280' }}>
          ¿No tienes cuenta? <Link to="/register" style={{ color:'#e91e63', fontWeight:600, textDecoration:'none' }}>Registra tu restaurante</Link>
        </p>
      </div>
    </div>
  )
}
