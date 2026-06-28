import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authSignUp } from '@/lib/api'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ nombre:'', apellido:'', email:'', password:'', confirm:'' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(k: string, v: string) { setForm(prev => ({ ...prev, [k]: v })); setError('') }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true)
    const { error: err } = await authSignUp(form.email, form.password, form.nombre, form.apellido)
    if (err) { setError(err.message); setLoading(false); return }
    navigate('/setup')
  }

  const inp: React.CSSProperties = { width:'100%', padding:'11px 14px', borderRadius:12, border:'2px solid #e2e8f0', fontSize:15, boxSizing:'border-box', outline:'none' }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#fff7ed,#fef3c7,#fff)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Georgia,serif', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:24, padding:36, maxWidth:440, width:'100%', boxShadow:'0 8px 40px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <span style={{ fontSize:48 }}>🍜</span>
          <h1 style={{ fontSize:24, fontWeight:900, margin:'8px 0 4px', color:'#9a3412' }}>Crear Cuenta</h1>
          <p style={{ color:'#64748b', fontSize:14 }}>Registra el administrador de tu restaurante</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            <div>
              <label style={{ fontSize:13, fontWeight:700, display:'block', marginBottom:5 }}>Nombre</label>
              <input required value={form.nombre} onChange={e=>set('nombre',e.target.value)} placeholder="María" style={inp} />
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:700, display:'block', marginBottom:5 }}>Apellido</label>
              <input required value={form.apellido} onChange={e=>set('apellido',e.target.value)} placeholder="Quispe" style={inp} />
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:13, fontWeight:700, display:'block', marginBottom:5 }}>📧 Email</label>
            <input type="email" required value={form.email} onChange={e=>set('email',e.target.value)} placeholder="tu@email.com" style={inp} />
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:13, fontWeight:700, display:'block', marginBottom:5 }}>🔒 Contraseña</label>
            <input type="password" required value={form.password} onChange={e=>set('password',e.target.value)} placeholder="Mínimo 6 caracteres" style={inp} />
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:13, fontWeight:700, display:'block', marginBottom:5 }}>🔒 Confirmar Contraseña</label>
            <input type="password" required value={form.confirm} onChange={e=>set('confirm',e.target.value)} placeholder="Repetir contraseña" style={inp} />
          </div>
          {error && <p style={{ color:'#ef4444', fontSize:13, marginBottom:12, fontWeight:600 }}>⚠️ {error}</p>}
          <button type="submit" disabled={loading} style={{ width:'100%', padding:'13px 0', borderRadius:14, border:'none', background:'linear-gradient(135deg,#f97316,#ef4444)', color:'#fff', fontWeight:900, fontSize:16, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1 }}>
            {loading ? 'Creando cuenta…' : 'Crear Cuenta →'}
          </button>
        </form>
        <p style={{ textAlign:'center', marginTop:20, fontSize:14, color:'#64748b' }}>
          ¿Ya tienes cuenta? <Link to="/login" style={{ color:'#f97316', fontWeight:700, textDecoration:'none' }}>Iniciar sesión</Link>
        </p>
      </div>
    </div>
  )
}
