import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRestaurante } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { slugify } from '@/lib/utils'

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

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

  const inp: React.CSSProperties = { width:'100%', padding:'12px 14px', borderRadius:8, border:'1px solid #d1d5db', fontSize:14, boxSizing:'border-box', outline:'none', fontFamily:font }

  return (
    <div style={{ minHeight:'100vh', background:'#f9fafb', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:font, padding:16 }}>
      <div style={{ width:'100%', maxWidth:480 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <h1 style={{ fontSize:24, fontWeight:700, margin:'0 0 6px', color:'#1f2937' }}>Configura tu Restaurante</h1>
          <p style={{ color:'#6b7280', fontSize:14, margin:0 }}>Un último paso para activar tu sistema</p>
        </div>
        <div style={{ background:'#fff', borderRadius:12, padding:32, border:'1px solid #e5e7eb', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6, color:'#374151' }}>Nombre del Restaurante *</label>
              <input required value={form.nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej. Pensión La Cocinita" style={inp} />
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6, color:'#374151' }}>URL pública</label>
              <div style={{ display:'flex', alignItems:'center', background:'#f9fafb', borderRadius:8, border:'1px solid #d1d5db', overflow:'hidden' }}>
                <span style={{ padding:'12px', color:'#6b7280', fontSize:14, borderRight:'1px solid #d1d5db', whiteSpace:'nowrap', background:'#f3f4f6' }}>/menu/</span>
                <input value={slug} onChange={e=>setSlug(slugify(e.target.value))} placeholder="mi-pension" style={{ ...inp, border:'none', borderRadius:0, background:'transparent' }} />
              </div>
              <p style={{ fontSize:12, color:'#6b7280', marginTop:4 }}>Tus clientes reservarán en: <strong>/menu/{slug||'tu-pension'}</strong></p>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6, color:'#374151' }}>Descripción</label>
              <textarea value={form.descripcion} onChange={e=>set('descripcion',e.target.value)} placeholder="Almuerzos caseros a buen precio..." rows={2} style={{ ...inp, resize:'vertical' }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6, color:'#374151' }}>Teléfono</label>
                <input value={form.telefono} onChange={e=>set('telefono',e.target.value)} placeholder="79000000" style={inp} />
              </div>
              <div>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6, color:'#374151' }}>Ciudad</label>
                <input value={form.ciudad} onChange={e=>set('ciudad',e.target.value)} style={inp} />
              </div>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6, color:'#374151' }}>Dirección</label>
              <input value={form.direccion} onChange={e=>set('direccion',e.target.value)} placeholder="Calle..." style={inp} />
            </div>
            {error && <p style={{ color:'#dc2626', fontSize:13, marginBottom:12, fontWeight:500, background:'#fef2f2', padding:'8px 12px', borderRadius:6, border:'1px solid #fecaca' }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ width:'100%', padding:'12px 0', borderRadius:8, border:'none', background:'#f97316', color:'#fff', fontWeight:600, fontSize:15, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1, fontFamily:font }}>
              {loading ? 'Creando...' : 'Activar mi Restaurante'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
