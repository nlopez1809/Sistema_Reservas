import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    // Supabase sends tokens in the URL hash
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    if (accessToken) {
      setHasToken(true)
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken || '' })
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Las contrasenas no coinciden'); return }
    if (password.length < 6) { setError('La contrasena debe tener al menos 6 caracteres'); return }
    setLoading(true); setError('')
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Error al actualizar')
    } finally {
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = { width:'100%', padding:'12px 14px', borderRadius:8, border:'1px solid #d1d5db', fontSize:14, boxSizing:'border-box', outline:'none', fontFamily:font }

  return (
    <div style={{ minHeight:'100vh', background:'#f9fafb', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:font, padding:16 }}>
      <div style={{ width:'100%', maxWidth:400 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:'0 0 6px', color:'#1f2937' }}>Nueva Contrasena</h1>
          <p style={{ color:'#6b7280', fontSize:14, margin:0 }}>Ingresa tu nueva contrasena</p>
        </div>
        <div style={{ background:'#fff', borderRadius:12, padding:32, border:'1px solid #e5e7eb', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
          {success ? (
            <div style={{ textAlign:'center' }}>
              <div style={{ width:64, height:64, borderRadius:'50%', background:'#dcfce7', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <p style={{ color:'#374151', fontSize:14, lineHeight:1.6, marginBottom:16 }}>Contrasena actualizada correctamente.</p>
              <Link to="/login" style={{ display:'inline-block', padding:'12px 24px', borderRadius:8, background:'#f97316', color:'#fff', fontWeight:600, fontSize:15, textDecoration:'none', fontFamily:font }}>Ir a Iniciar Sesion</Link>
            </div>
          ) : !hasToken ? (
            <div style={{ textAlign:'center' }}>
              <p style={{ color:'#6b7280', fontSize:14 }}>Enlace invalido o expirado.</p>
              <Link to="/forgot-password" style={{ color:'#f97316', fontWeight:600, textDecoration:'none', fontSize:14 }}>Solicitar nuevo enlace</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6, color:'#374151' }}>Nueva contrasena</label>
                <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimo 6 caracteres" style={inp} />
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6, color:'#374151' }}>Confirmar contrasena</label>
                <input type="password" required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repite la contrasena" style={inp} />
              </div>
              {error && <p style={{ color:'#dc2626', fontSize:13, marginBottom:12, fontWeight:500, background:'#fef2f2', padding:'8px 12px', borderRadius:6, border:'1px solid #fecaca' }}>{error}</p>}
              <button type="submit" disabled={loading} style={{ width:'100%', padding:'12px 0', borderRadius:8, border:'none', background:'#f97316', color:'#fff', fontWeight:600, fontSize:15, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1, fontFamily:font }}>
                {loading ? 'Guardando...' : 'Guardar contrasena'}
              </button>
            </form>
          )}
        </div>
        <p style={{ textAlign:'center', marginTop:20, fontSize:14, color:'#6b7280' }}>
          <Link to="/login" style={{ color:'#f97316', fontWeight:600, textDecoration:'none' }}>Volver al inicio de sesion</Link>
        </p>
      </div>
    </div>
  )
}
