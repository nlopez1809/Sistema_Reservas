import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authSignUp } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { refreshSession } = useAuth()
  const [form, setForm] = useState({ nombre:'', apellido:'', email:'', password:'', confirm:'' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function set(k: string, v: string) { setForm(prev => ({ ...prev, [k]: v })); setError('') }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true)
    const { error: err } = await authSignUp(form.email, form.password, form.nombre, form.apellido)
    if (err) { setError(err.message); setLoading(false); return }
    // Wait for Supabase session to be ready before navigating
    for (let i = 0; i < 10; i++) {
      const { data } = await supabase.auth.getSession()
      if (data.session?.access_token) break
      await new Promise(r => setTimeout(r, 500))
    }
    await refreshSession()
    navigate('/setup')
  }

  const inp: React.CSSProperties = { width:'100%', padding:'12px 14px', borderRadius:8, border:'1px solid #d1d5db', fontSize:14, boxSizing:'border-box', outline:'none', fontFamily:font }

  return (
    <div style={{ minHeight:'100vh', background:'#f9fafb', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:font, padding:16 }}>
      <div style={{ width:'100%', maxWidth:440 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:'0 0 6px', color:'#1f2937' }}>Crear Cuenta</h1>
          <p style={{ color:'#6b7280', fontSize:14, margin:0 }}>Registra el administrador de tu restaurante</p>
        </div>
        <div style={{ background:'#fff', borderRadius:12, padding:32, border:'1px solid #e5e7eb', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6, color:'#374151' }}>Nombre</label>
                <input required value={form.nombre} onChange={e=>set('nombre',e.target.value)} placeholder="María" style={inp} />
              </div>
              <div>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6, color:'#374151' }}>Apellido</label>
                <input required value={form.apellido} onChange={e=>set('apellido',e.target.value)} placeholder="Quispe" style={inp} />
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6, color:'#374151' }}>Email</label>
              <input type="email" required value={form.email} onChange={e=>set('email',e.target.value)} placeholder="tu@email.com" style={inp} />
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6, color:'#374151' }}>Contraseña</label>
              <div style={{ position:'relative' }}>
                <input type={showPass ? 'text' : 'password'} required value={form.password} onChange={e=>set('password',e.target.value)} placeholder="Mínimo 6 caracteres" style={{ ...inp, paddingRight:60 }} />
                <button type="button" onClick={()=>setShowPass(!showPass)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#6b7280', padding:4, fontFamily:font }}>{showPass ? 'Ocultar' : 'Mostrar'}</button>
              </div>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6, color:'#374151' }}>Confirmar Contraseña</label>
              <div style={{ position:'relative' }}>
                <input type={showConfirm ? 'text' : 'password'} required value={form.confirm} onChange={e=>set('confirm',e.target.value)} placeholder="Repetir contraseña" style={{ ...inp, paddingRight:60 }} />
                <button type="button" onClick={()=>setShowConfirm(!showConfirm)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#6b7280', padding:4, fontFamily:font }}>{showConfirm ? 'Ocultar' : 'Mostrar'}</button>
              </div>
            </div>
            {error && <p style={{ color:'#dc2626', fontSize:13, marginBottom:12, fontWeight:500, background:'#fef2f2', padding:'8px 12px', borderRadius:6, border:'1px solid #fecaca' }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ width:'100%', padding:'12px 0', borderRadius:8, border:'none', background:'#f97316', color:'#fff', fontWeight:600, fontSize:15, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1, fontFamily:font }}>
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>
          </form>
        </div>
        <p style={{ textAlign:'center', marginTop:20, fontSize:14, color:'#6b7280' }}>
          ¿Ya tienes cuenta? <Link to="/login" style={{ color:'#f97316', fontWeight:600, textDecoration:'none' }}>Iniciar sesión</Link>
        </p>
      </div>
    </div>
  )
}
