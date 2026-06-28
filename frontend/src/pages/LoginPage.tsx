import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authSignIn } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

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

  const inp: React.CSSProperties = { width:'100%', padding:'11px 14px', borderRadius:12, border:'2px solid #e2e8f0', fontSize:15, boxSizing:'border-box', outline:'none' }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#fff7ed,#fef3c7,#fff)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Georgia,serif' }}>
      <div style={{ background:'#fff', borderRadius:24, padding:36, maxWidth:400, width:'100%', boxShadow:'0 8px 40px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <span style={{ fontSize:48 }}>🍜</span>
          <h1 style={{ fontSize:24, fontWeight:900, margin:'8px 0 4px', color:'#9a3412' }}>Iniciar Sesión</h1>
          <p style={{ color:'#64748b', fontSize:14 }}>Accede a tu panel de administración</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:13, fontWeight:700, display:'block', marginBottom:5 }}>📧 Email</label>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" style={inp} />
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:13, fontWeight:700, display:'block', marginBottom:5 }}>🔒 Contraseña</label>
            <div style={{ position:'relative' }}>
              <input type={showPass ? 'text' : 'password'} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={{ ...inp, paddingRight:42 }} />
              <button type="button" onClick={()=>setShowPass(!showPass)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#475569', padding:4 }}>{showPass ? '🙈' : '👁️'}</button>
            </div>
          </div>
          {error && <p style={{ color:'#ef4444', fontSize:13, marginBottom:12, fontWeight:600 }}>⚠️ {error}</p>}
          <button type="submit" disabled={loading} style={{ width:'100%', padding:'13px 0', borderRadius:14, border:'none', background:'linear-gradient(135deg,#f97316,#ef4444)', color:'#fff', fontWeight:900, fontSize:16, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1 }}>
            {loading ? 'Iniciando…' : 'Iniciar Sesión →'}
          </button>
        </form>
        <p style={{ textAlign:'center', marginTop:20, fontSize:14, color:'#64748b' }}>
          ¿No tienes cuenta? <Link to="/register" style={{ color:'#f97316', fontWeight:700, textDecoration:'none' }}>Registra tu restaurante</Link>
        </p>
      </div>
    </div>
  )
}
