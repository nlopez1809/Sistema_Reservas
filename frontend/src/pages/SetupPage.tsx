import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRestaurante } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { slugify } from '@/lib/utils'

export default function SetupPage() {
  const navigate = useNavigate()
  const { refreshSession } = useAuth()
  const [form, setForm] = useState({ nombre:'', descripcion:'', telefono:'', direccion:'', ciudad:'La Paz' })
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function setNombre(v: string) {
    setForm(p => ({ ...p, nombre: v }))
    setSlug(slugify(v))
  }
  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    if (!slug) { setError('El slug es obligatorio'); return }
    setLoading(true); setError('')
    try {
      await createRestaurante({ ...form, slug })
      await refreshSession()
      navigate('/admin')
    } catch (err: any) {
      setError(err.message || 'Error al crear el restaurante')
    } finally { setLoading(false) }
  }

  const inp: React.CSSProperties = { width:'100%', padding:'11px 14px', borderRadius:12, border:'2px solid #e2e8f0', fontSize:15, boxSizing:'border-box', outline:'none' }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#fff7ed,#fef3c7,#fff)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Georgia,serif', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:24, padding:36, maxWidth:480, width:'100%', boxShadow:'0 8px 40px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <span style={{ fontSize:48 }}>🏪</span>
          <h1 style={{ fontSize:24, fontWeight:900, margin:'8px 0 4px', color:'#9a3412' }}>Configura tu Restaurante</h1>
          <p style={{ color:'#64748b', fontSize:14 }}>Un último paso para activar tu sistema</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:13, fontWeight:700, display:'block', marginBottom:5 }}>🏪 Nombre del Restaurante / Pensión *</label>
            <input required value={form.nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej. Pensión La Cocinita" style={inp} />
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:13, fontWeight:700, display:'block', marginBottom:5 }}>🔗 URL pública</label>
            <div style={{ display:'flex', alignItems:'center', background:'#f8fafc', borderRadius:12, border:'2px solid #e2e8f0', overflow:'hidden' }}>
              <span style={{ padding:'11px 12px', color:'#475569', fontSize:14, borderRight:'2px solid #e2e8f0', whiteSpace:'nowrap' }}>/menu/</span>
              <input value={slug} onChange={e=>setSlug(slugify(e.target.value))} placeholder="mi-pension" style={{ ...inp, border:'none', borderRadius:0, background:'transparent' }} />
            </div>
            <p style={{ fontSize:11, color:'#475569', marginTop:4 }}>Tus clientes reservarán en: <strong>/menu/{slug||'tu-pension'}</strong></p>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:13, fontWeight:700, display:'block', marginBottom:5 }}>📝 Descripción</label>
            <textarea value={form.descripcion} onChange={e=>set('descripcion',e.target.value)} placeholder="Almuerzos caseros a buen precio…" rows={2} style={{ ...inp, resize:'vertical' }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            <div>
              <label style={{ fontSize:13, fontWeight:700, display:'block', marginBottom:5 }}>📱 Teléfono</label>
              <input value={form.telefono} onChange={e=>set('telefono',e.target.value)} placeholder="79000000" style={inp} />
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:700, display:'block', marginBottom:5 }}>🏙️ Ciudad</label>
              <input value={form.ciudad} onChange={e=>set('ciudad',e.target.value)} style={inp} />
            </div>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:13, fontWeight:700, display:'block', marginBottom:5 }}>📍 Dirección</label>
            <input value={form.direccion} onChange={e=>set('direccion',e.target.value)} placeholder="Calle…" style={inp} />
          </div>
          {error && <p style={{ color:'#ef4444', fontSize:13, marginBottom:12, fontWeight:600 }}>⚠️ {error}</p>}
          <button type="submit" disabled={loading} style={{ width:'100%', padding:'13px 0', borderRadius:14, border:'none', background:'linear-gradient(135deg,#f97316,#ef4444)', color:'#fff', fontWeight:900, fontSize:16, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1 }}>
            {loading ? 'Creando…' : '¡Activar mi Restaurante! 🚀'}
          </button>
        </form>
      </div>
    </div>
  )
}
