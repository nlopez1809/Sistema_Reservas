import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { authSignOut, getDias, toggleDia, getPlatos, createPlato, updatePlato, deletePlato, getPedidos, getClientes, getContDiaria, getContSemanal, getContMensual, getTopPlatos, updateRestaurante, resetStock, getStock, updateStock, updatePedidoEstado } from '@/lib/api'
import { fmtCur, downloadCSV, ALL_DAYS } from '@/lib/utils'
import { useRealtimeOrders, playNotificationSound, requestNotificationPermission, showBrowserNotification } from '@/hooks/useRealtimeOrders'
import { NotificationToast, NotificationBell, NotificationHistory } from '@/components/NotificationToast'
import type { Dia, Plato, Pedido, Cliente } from '@/types'

export default function AdminPage() {
  const navigate = useNavigate()
  const { session, refreshSession } = useAuth()
  const [tab, setTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const [dias, setDias] = useState<Dia[]>([])
  const [platos, setPlatos] = useState<Plato[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [contDiaria, setContDiaria] = useState<any[]>([])
  const [contSemanal, setContSemanal] = useState<any[]>([])
  const [contMensual, setContMensual] = useState<any[]>([])
  const [topPlatos, setTopPlatos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editDay, setEditDay] = useState('Lunes')
  const [editItem, setEditItem] = useState<Plato|null>(null)
  const [editForm, setEditForm] = useState<Partial<Plato>>({})
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState<Partial<Plato>>({ categoria:'sopa', stock:20, stock_inicial:20, precio:10, emoji:'🍽️' })
  const [restForm, setRestForm] = useState({ nombre:'', descripcion:'', telefono:'', ciudad:'', direccion:'' })
  const fileRef = useRef<HTMLInputElement>(null)
  const qrFileRef = useRef<HTMLInputElement>(null)
  const [uploadingQr, setUploadingQr] = useState(false)
  const [qrError, setQrError] = useState('')
  const [qrSuccess, setQrSuccess] = useState(false)
  const logoFileRef = useRef<HTMLInputElement>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoError, setLogoError] = useState('')
  const [logoSuccess, setLogoSuccess] = useState(false)
  const [stockData, setStockData] = useState<any[]>([])
  const [resettingStock, setResettingStock] = useState(false)
  const [resetMsg, setResetMsg] = useState('')
  const [editingStock, setEditingStock] = useState<Record<number,number>>({})
  const [disableModal, setDisableModal] = useState<{dia:Dia}|null>(null)
  const [disableMsg, setDisableMsg] = useState('')
  const [pedidoSearch, setPedidoSearch] = useState('')
  const [estadoDropdown, setEstadoDropdown] = useState<number|null>(null)
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('notif_sound') !== 'off')
  const [horario, setHorario] = useState({ hora_apertura:'08:00', hora_cierre:'15:00' })

  async function handleQrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !rest?.id) return
    if (file.size > 2 * 1024 * 1024) { setQrError('El archivo supera los 2 MB'); return }

    setUploadingQr(true); setQrError(''); setQrSuccess(false)
    try {
      const ext = file.name.split('.').pop()
      const path = `${rest.id}/qr.${ext}`

      const { error: upErr } = await supabase.storage
        .from('qr-pagos')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (upErr) throw new Error(upErr.message)

      const { data: { publicUrl } } = supabase.storage
        .from('qr-pagos')
        .getPublicUrl(path)

      // Add cache-busting so the new image shows immediately
      const qr_url = `${publicUrl}?t=${Date.now()}`
      await updateRestaurante({ qr_url })
      await refreshSession()
      setQrSuccess(true)
    } catch (err: any) {
      setQrError(err.message || 'Error al subir la imagen')
    } finally {
      setUploadingQr(false)
      // Reset input so same file can be re-uploaded
      if (qrFileRef.current) qrFileRef.current.value = ''
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !rest?.id) return
    if (file.size > 2 * 1024 * 1024) { setLogoError('El archivo supera los 2 MB'); return }

    setUploadingLogo(true); setLogoError(''); setLogoSuccess(false)
    try {
      const ext = file.name.split('.').pop()
      const path = `${rest.id}/logo.${ext}`

      const { error: upErr } = await supabase.storage
        .from('qr-pagos')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (upErr) throw new Error(upErr.message)

      const { data: { publicUrl } } = supabase.storage
        .from('qr-pagos')
        .getPublicUrl(path)

      const logo_url = `${publicUrl}?t=${Date.now()}`
      await updateRestaurante({ logo_url })
      await refreshSession()
      setLogoSuccess(true)
    } catch (err: any) {
      setLogoError(err.message || 'Error al subir la imagen')
    } finally {
      setUploadingLogo(false)
      if (logoFileRef.current) logoFileRef.current.value = ''
    }
  }

  // ── Notification state ────────────────────────────────────────────────────
  const [toastPedido, setToastPedido] = useState<Pedido | null>(null)
  const [notifHistory, setNotifHistory] = useState<Pedido[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showHistory, setShowHistory] = useState(false)
  const [notifEnabled, setNotifEnabled] = useState(false)

  const rest = session?.restaurante
  const slug = rest?.slug ?? ''
  const plan = rest?.plan ?? 'starter'
  const trialEnds = rest?.trial_ends ? new Date(rest.trial_ends) : rest?.creado_en ? new Date(new Date(rest.creado_en).getTime() + 30*24*60*60*1000) : null
  const inTrial = trialEnds ? new Date() < trialEnds : false
  const trialDays = trialEnds ? Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / (24*60*60*1000))) : 0
  const canAccess = (feature: string) => {
    if (inTrial) return true
    if (feature === 'clientes' || feature === 'contabilidad') return plan !== 'starter'
    if (feature === 'csv') return plan === 'premium'
    return true
  }

  // Request browser notification permission on mount
  useEffect(() => {
    requestNotificationPermission().then(granted => setNotifEnabled(granted))
  }, [])

  // Handle incoming real-time order
  const handleNewOrder = useCallback((pedido: Pedido) => {
    // Add to pedidos list at the top
    setPedidos(prev => [pedido, ...prev])
    // Show toast
    setToastPedido(pedido)
    // Add to history
    setNotifHistory(prev => [pedido, ...prev].slice(0, 20))
    // Increment badge
    setUnreadCount(prev => prev + 1)
    // Play sound (respects user preference)
    if (localStorage.getItem('notif_sound') !== 'off') playNotificationSound()
    // Browser push notification
    const nombre = pedido.cliente ? `${pedido.cliente.nombre} ${pedido.cliente.apellido}` : 'Cliente'
    showBrowserNotification(
      `🔔 Nuevo pedido — ${rest?.nombre ?? ''}`,
      `${nombre} · ${fmtCur(Number(pedido.total))} · ${pedido.consumo === 'local' ? 'En el local' : 'Para llevar'}`
    )
  }, [rest?.nombre])

  // Subscribe to realtime orders
  useRealtimeOrders({
    restauranteId: rest?.id ?? '',
    onNewOrder: handleNewOrder,
  })

  useEffect(() => {
    if (!session) return
    setRestForm({ nombre:rest?.nombre??'', descripcion:rest?.descripcion??'', telefono:rest?.telefono??'', ciudad:rest?.ciudad??'La Paz', direccion:rest?.direccion??'' })
    setHorario({ hora_apertura: (rest as any)?.hora_apertura ?? '08:00', hora_cierre: (rest as any)?.hora_cierre ?? '15:00' })
    loadAll()
  }, [session])

  async function loadAll() {
    setLoading(true)
    try {
      const [d,p,ped,cl,cd,cs,cm,tp,st] = await Promise.all([getDias(),getPlatos(),getPedidos(),getClientes(),getContDiaria(),getContSemanal(),getContMensual(),getTopPlatos(),getStock()])
      setDias(d); setPlatos(p); setPedidos(ped); setClientes(cl)
      setContDiaria(cd); setContSemanal(cs); setContMensual(cm); setTopPlatos(tp); setStockData(st)
    } catch(e){ console.error(e) } finally { setLoading(false) }
  }

  async function handleResetStock() {
    if (!confirm('¿Resetear el stock de todos los platos a su valor inicial?\nEsto simula el inicio de un nuevo día.')) return
    setResettingStock(true); setResetMsg('')
    try {
      const { updated } = await resetStock()
      // Refresh platos and stock data
      const [p, st] = await Promise.all([getPlatos(), getStock()])
      setPlatos(p); setStockData(st)
      setResetMsg(`✅ Stock reseteado correctamente — ${updated} platos actualizados`)
    } catch(e: any) {
      setResetMsg('❌ Error al resetear: ' + (e.message || 'intenta de nuevo'))
    } finally {
      setResettingStock(false)
      setTimeout(() => setResetMsg(''), 5000)
    }
  }

  async function handleUpdateStock(platoId: number, newStock: number) {
    try {
      await updateStock(platoId, newStock)
      setStockData(prev => prev.map(p => p.id === platoId ? {...p, stock: newStock} : p))
      setPlatos(prev => prev.map(p => p.id === platoId ? {...p, stock: newStock} : p))
      setEditingStock(prev => { const n = {...prev}; delete n[platoId]; return n })
    } catch(e: any) {
      alert('Error al actualizar stock: ' + e.message)
    }
  }

  async function handleSignOut() { await authSignOut(); navigate('/login') }

  const platosDelDia = platos.filter(p=>{ const d=dias.find(x=>x.nombre===editDay); return d&&p.dia_id===d.id })
  const sopas = platosDelDia.filter(p=>p.categoria==='sopa')
  const segundos = platosDelDia.filter(p=>p.categoria==='segundo')
  const extras = platosDelDia.filter(p=>p.categoria==='extra')

  const pedidosActivos = pedidos.filter(o=>o.estado!=='cancelado')
  const totalRev = pedidosActivos.reduce((s,o)=>s+Number(o.total),0)
  const localN = pedidosActivos.filter(o=>o.consumo==='local').length
  const llevarN = pedidosActivos.filter(o=>o.consumo==='llevar').length
  const efecN = pedidosActivos.filter(o=>o.metodo_pago==='efectivo').length
  const qrN = pedidosActivos.filter(o=>o.metodo_pago==='qr').length
  const salesByDay: Record<string,number>={}
  pedidosActivos.forEach(o=>{ if(o.dia?.nombre) salesByDay[o.dia.nombre]=(salesByDay[o.dia.nombre]||0)+Number(o.total) })

  const tabBtn=(active:boolean):React.CSSProperties=>({ padding:'8px 14px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:700,fontSize:12,background:active?'#e91e63':'#f1f5f9',color:active?'#fff':'#64748b' })
  const th:React.CSSProperties={ padding:'9px 12px',textAlign:'left',fontWeight:600,color:'#6b7280',borderBottom:'2px solid #e5e7eb',fontSize:12,whiteSpace:'nowrap' }
  const td:React.CSSProperties={ padding:'9px 12px',fontSize:12 }
  const rowBg=(i:number):React.CSSProperties=>({ background:i%2===0?'#fff':'#f8fafc' })
  const inp:React.CSSProperties={ width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid #d1d5db',fontSize:14,boxSizing:'border-box' }

  function barRow(label:string,val:number,total:number,col:string) {
    return (<div style={{ marginBottom:12 }}>
      <div style={{ display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:4 }}>
        <span style={{ fontWeight:600 }}>{label}</span>
        <span style={{ fontWeight:800 }}>{val} ({total?Math.round(val/total*100):0}%)</span>
      </div>
      <div style={{ height:8,background:'#f1f5f9',borderRadius:99 }}>
        <div style={{ width:`${total?val/total*100:0}%`,height:'100%',background:col,borderRadius:99 }}/>
      </div>
    </div>)
  }

  const [reportModal, setReportModal] = useState<null|'dashboard'|'pedidos'|'clientes'>(null)

  return (
    <div style={{ minHeight:'100vh', background:'#f9fafb', fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>

      {/* ── Notification Toast ── */}
      {toastPedido && (
        <NotificationToast
          pedido={toastPedido}
          onClose={() => setToastPedido(null)}
          onView={() => { setTab('pedidos'); setShowHistory(false) }}
        />
      )}

      {/* ── Notification History Panel ── */}
      {showHistory && (
        <NotificationHistory
          notifications={notifHistory}
          onClose={() => setShowHistory(false)}
          onViewPedidos={() => { setTab('pedidos'); setShowHistory(false) }}
        />
      )}

      {/* ── Report Modals ── */}
      {reportModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}
          onClick={()=>setReportModal(null)}>
          <div style={{ background:'#fff',borderRadius:12,padding:28,maxWidth:700,width:'100%',maxHeight:'85vh',overflowY:'auto',boxShadow:'0 4px 16px rgba(0,0,0,0.12)' }}
            onClick={e=>e.stopPropagation()}>
            {/* Dashboard report */}
            {reportModal==='dashboard' && (<>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
                <h3 style={{ margin:0,fontWeight:900,fontSize:17 }}>Resumen General</h3>
                <div style={{ display:'flex',gap:8 }}>
                  <button onClick={()=>{if(!canAccess('csv')){alert('Exportar CSV requiere el plan Premium.');return}downloadCSV(`dashboard.csv`,['Indicador','Valor'],[['Total Recaudado',fmtCur(totalRev)],['Pedidos',pedidos.length],['En Local',localN],['Para Llevar',llevarN],...ALL_DAYS.map(d=>[`Ventas ${d}`,fmtCur(salesByDay[d]||0)])])}} style={{ padding:'7px 14px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:700,fontSize:12,background:'#e91e63',color:'#fff' }}>Descargar</button>
                  <button onClick={()=>setReportModal(null)} style={{ padding:'7px 12px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:700,fontSize:13,background:'#f1f5f9',color:'#64748b' }}>✕</button>
                </div>
              </div>
              <table style={{ width:'100%',borderCollapse:'collapse' }}>
                <thead><tr style={{ background:'#f8fafc' }}>{['Indicador','Valor'].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead>
                <tbody>
                  {[['Total Recaudado',fmtCur(totalRev)],['Total Pedidos',pedidos.length],['En Local',localN],['Para Llevar',llevarN],['Pago Efectivo',efecN],['Pago QR',qrN],...ALL_DAYS.map(d=>[`Ventas ${d}`,fmtCur(salesByDay[d]||0)])].map(([k,v],i)=>(
                    <tr key={i} style={rowBg(i)}><td style={{ ...td,fontWeight:700 }}>{k}</td><td style={{ ...td,fontWeight:800,color:'#e91e63' }}>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </>)}
            {/* Pedidos report */}
            {reportModal==='pedidos' && (<>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
                <h3 style={{ margin:0,fontWeight:900,fontSize:17 }}>Reporte de Pedidos</h3>
                <div style={{ display:'flex',gap:8 }}>
                  <button onClick={()=>{if(!canAccess('csv')){alert('Exportar CSV requiere el plan Premium.');return}downloadCSV(`pedidos.csv`,['Código','Fecha','Día','Cliente','WhatsApp','Hora','Consumo','Pago','Total'],pedidos.map(o=>[o.codigo,new Date(o.creado_en).toLocaleDateString('es-BO'),o.dia?.nombre??'',`${o.cliente?.nombre??''} ${o.cliente?.apellido??''}`,o.cliente?.whatsapp??'',o.hora_recojo,o.consumo,o.metodo_pago,o.total]))}} style={{ padding:'7px 14px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:700,fontSize:12,background:'#1f2937',color:'#fff' }}>Descargar</button>
                  <button onClick={()=>setReportModal(null)} style={{ padding:'7px 12px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:700,fontSize:13,background:'#f1f5f9',color:'#64748b' }}>✕</button>
                </div>
              </div>
              {pedidos.length===0?<p style={{ color:'#475569',textAlign:'center',padding:40 }}>Sin pedidos aún.</p>:(
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%',borderCollapse:'collapse' }}>
                    <thead><tr style={{ background:'#f8fafc' }}>{['Código','Fecha','Cliente','WhatsApp','Día','Hora','Consumo','Pago','Total'].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead>
                    <tbody>{pedidos.map((o,i)=>(<tr key={o.id} style={rowBg(i)}>
                      <td style={{ ...td,fontWeight:700 }}>{o.codigo}</td>
                      <td style={td}>{new Date(o.creado_en).toLocaleDateString('es-BO')}</td>
                      <td style={{ ...td,fontWeight:700 }}>{o.cliente?`${o.cliente.nombre} ${o.cliente.apellido}`:'—'}</td>
                      <td style={td}>{o.cliente?.whatsapp??'—'}</td>
                      <td style={td}>{o.dia?.nombre||'—'}</td>
                      <td style={{ ...td,color:'#7c3aed',fontWeight:700 }}>{o.hora_recojo||'—'}</td>
                      <td style={td}><span style={{ background:o.consumo==='local'?'#eff6ff':'#f5f3ff',color:o.consumo==='local'?'#1d4ed8':'#6d28d9',padding:'2px 8px',borderRadius:99,fontWeight:700,fontSize:11 }}>{o.consumo==='local'?'🍽️ Local':'📦 Llevar'}</span></td>
                      <td style={td}><span style={{ background:o.metodo_pago==='efectivo'?'#f0fdf4':'#eff6ff',color:o.metodo_pago==='efectivo'?'#166534':'#1e40af',padding:'2px 8px',borderRadius:99,fontWeight:700,fontSize:11 }}>{o.metodo_pago==='efectivo'?'💵':'📱'} {o.metodo_pago}</span></td>
                      <td style={{ ...td,fontWeight:900,color:'#e91e63' }}>{fmtCur(Number(o.total))}</td>
                    </tr>))}</tbody>
                  </table>
                </div>
              )}
            </>)}
            {/* Clientes report */}
            {reportModal==='clientes' && (<>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
                <h3 style={{ margin:0,fontWeight:900,fontSize:17 }}>Reporte de Clientes</h3>
                <div style={{ display:'flex',gap:8 }}>
                  <button onClick={()=>{if(!canAccess('csv')){alert('Exportar CSV requiere el plan Premium.');return}downloadCSV(`clientes.csv`,['#','Nombre','Apellido','WhatsApp','Pedidos'],clientes.sort((a,b)=>(b.total_pedidos||0)-(a.total_pedidos||0)).map((c,i)=>[i+1,c.nombre,c.apellido,c.whatsapp,c.total_pedidos||0]))}} style={{ padding:'7px 14px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:700,fontSize:12,background:'#6b7280',color:'#fff' }}>Descargar</button>
                  <button onClick={()=>setReportModal(null)} style={{ padding:'7px 12px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:700,fontSize:13,background:'#f1f5f9',color:'#64748b' }}>✕</button>
                </div>
              </div>
              {clientes.length===0?<p style={{ color:'#475569',textAlign:'center',padding:40 }}>Sin clientes aún.</p>:(
                <table style={{ width:'100%',borderCollapse:'collapse' }}>
                  <thead><tr style={{ background:'#f8fafc' }}>{['#','Nombre','Apellido','WhatsApp','Pedidos','Último Pedido'].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead>
                  <tbody>{[...clientes].sort((a,b)=>(b.total_pedidos||0)-(a.total_pedidos||0)).map((c,i)=>{
                    return (
                      <tr key={c.id} style={rowBg(i)}>
                        <td style={{ ...td,color:'#475569',fontWeight:700 }}>{i+1}</td>
                        <td style={{ ...td,fontWeight:800 }}>{c.nombre}</td>
                        <td style={td}>{c.apellido}</td>
                        <td style={td}><a href={'https://wa.me/591' + c.whatsapp} target="_blank" rel="noreferrer" style={{ color:'#22c55e',fontWeight:700,textDecoration:'none' }}>📱 {c.whatsapp}</a></td>
                        <td style={td}><span style={{ background:(c.total_pedidos||0)>=5?'#fef3c7':(c.total_pedidos||0)>=3?'#eff6ff':'#f1f5f9',color:(c.total_pedidos||0)>=5?'#92400e':(c.total_pedidos||0)>=3?'#1d4ed8':'#374151',borderRadius:99,padding:'3px 12px',fontWeight:900,fontSize:13 }}>{(c.total_pedidos||0)>=5?'⭐':(c.total_pedidos||0)>=3?'🔵':'🔢'} {c.total_pedidos||0} pedido{(c.total_pedidos||0)!==1?'s':''}</span></td>
                        <td style={{ ...td,color:'#64748b',fontSize:12 }}>{c.ultimo_pedido?new Date(c.ultimo_pedido).toLocaleDateString('es-BO'):'—'}</td>
                      </tr>
                    )
                  })}</tbody>
                </table>
              )}
            </>)}
          </div>
        </div>
      )}

      {/* ── LAYOUT: Sidebar + Content ── */}
      <div style={{ display:'flex', minHeight:'100vh' }}>

        {/* Mobile overlay backdrop */}
        {isMobile && sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:90 }} />
        )}

        {/* SIDEBAR */}
        <div style={{
          width: 240, flexShrink: 0,
          background: '#fff', borderRight: '1px solid #e5e7eb',
          display: 'flex', flexDirection: 'column',
          position: isMobile ? 'fixed' : 'sticky', top: 0, height: '100vh', overflowY: 'auto',
          zIndex: isMobile ? 100 : 'auto',
          transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 0.25s ease-in-out',
        }}>
          {/* Logo / Restaurant name */}
          <div style={{ padding:'24px 20px 16px', borderBottom:'1px solid #e5e7eb' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              {rest?.logo_url ? <img src={rest.logo_url} alt="Logo" style={{ width:32,height:32,borderRadius:8,objectFit:'cover' }} /> : <span style={{ fontSize:28 }}>🍜</span>}
              <div>
                <div style={{ color:'#1f2937', fontWeight:900, fontSize:15, lineHeight:1.2 }}>{rest?.nombre ?? 'Mi Restaurante'}</div>
                <div style={{ color:'#9ca3af', fontSize:10, marginTop:2 }}>Plan {plan.charAt(0).toUpperCase()+plan.slice(1)} {inTrial?'(Prueba)':''}</div>
              </div>
            </div>
            <a href={`/menu/${slug}`} target="_blank" rel="noreferrer"
              style={{ display:'block', fontSize:11, color:'#e91e63', textDecoration:'none', fontWeight:600,
                background:'rgba(233,30,99,0.06)', borderRadius:8, padding:'4px 8px', marginTop:4 }}>
              /menu/{slug}
            </a>
          </div>

          {/* Nav items */}
          <nav style={{ flex:1, padding:'12px 12px' }}>
            {[
              { id:'_section', label:'Principal' },
              { id:'dashboard',    icon:'📊', label:'Dashboard' },
              { id:'menu',         icon:'🍽️', label:'Menú' },
              { id:'dias',         icon:'📅', label:'Días' },
              { id:'_section2', label:'Operaciones' },
              { id:'stock',        icon:'📦', label:'Stock' },
              { id:'pedidos',      icon:'📋', label:'Pedidos' },
              { id:'clientes',     icon:'👥', label:'Clientes' },
              { id:'_section3', label:'Negocio' },
              { id:'contabilidad', icon:'💵', label:'Contabilidad' },
              { id:'ajustes',      icon:'⚙️', label:'Ajustes' },
            ].map(item => {
              if (item.id.startsWith('_section')) return (
                <div key={item.id} style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase' as const, letterSpacing:1, padding:'12px 12px 4px', marginTop:4, borderTop: item.id === '_section' ? 'none' : '1px solid #e5e7eb' }}>
                  {item.label}
                </div>
              )
              return (
              <button
                key={item.id}
                onClick={() => { if(!canAccess(item.id)){alert(`Esta función requiere el plan Negocio o superior.`);return} setTab(item.id); if (isMobile) setSidebarOpen(false) }}
                style={{
                  width: '100%', display:'flex', alignItems:'center', gap:10,
                  padding:'10px 12px', borderRadius:10, border:'none', cursor:'pointer',
                  marginBottom: 2, textAlign:'left', fontSize:13, fontWeight:600,
                  transition:'all 0.15s',
                  background: tab===item.id ? '#fef1f5' : 'transparent',
                  color: tab===item.id ? '#e91e63' : '#6b7280',
                  borderLeft: tab===item.id ? '3px solid #e91e63' : '3px solid transparent',
                }}>
                <span style={{ fontSize:16, width:20, textAlign:'center' }}>{item.icon}</span>
                <span>{item.label}</span>
                {(item.id==='clientes'||item.id==='contabilidad') && !canAccess(item.id) && (
                  <span style={{ marginLeft:'auto', background:'#e91e63', color:'#fff', borderRadius:4, padding:'1px 6px', fontSize:9, fontWeight:800 }}>PRO</span>
                )}
                {item.id==='pedidos' && unreadCount>0 && (
                  <span style={{ marginLeft:'auto', background:'#ef4444', color:'#fff', borderRadius:99,
                    padding:'1px 7px', fontSize:10, fontWeight:900 }}>{unreadCount}</span>
                )}
              </button>
            )})
            }
          </nav>

          {/* Bottom: notifications + signout */}
          <div style={{ padding:'12px', borderTop:'1px solid #e5e7eb' }}>
            {/* Notification bell row */}
            <button
              onClick={() => { setShowHistory(prev=>!prev); setUnreadCount(0) }}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:10,
                padding:'10px 12px', borderRadius:10, border:'none', cursor:'pointer',
                background: showHistory?'#fef1f5':'transparent',
                color:'#6b7280', fontSize:13, fontWeight:600, textAlign:'left', marginBottom:4 }}>
              <span style={{ fontSize:16 }}>🔔</span>
              <span>Notificaciones</span>
              {unreadCount>0 && (
                <span style={{ marginLeft:'auto', background:'#ef4444', color:'#fff',
                  borderRadius:99, padding:'1px 7px', fontSize:10, fontWeight:900 }}>{unreadCount}</span>
              )}
            </button>
            {!notifEnabled && (
              <button onClick={() => requestNotificationPermission().then(g=>setNotifEnabled(g))}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10,
                  padding:'8px 12px', borderRadius:10, border:'none', cursor:'pointer',
                  background:'rgba(254,243,199,0.08)', color:'#fbbf24', fontSize:12, fontWeight:600,
                  textAlign:'left', marginBottom:4 }}>
                <span>🔕</span><span>Activar notificaciones</span>
              </button>
            )}
            <button onClick={handleSignOut}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:10,
                padding:'10px 12px', borderRadius:10, border:'none', cursor:'pointer',
                background:'#fef2f2', color:'#ef4444',
                fontSize:13, fontWeight:600, textAlign:'left' }}>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex:1, overflowY:'auto', background:'#f9fafb' }}>
          {/* Top bar */}
          <div style={{ background:'#fff', borderBottom:'1px solid #e5e7eb', padding: isMobile ? '10px 14px' : '14px 28px',
            display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {isMobile && (
                <button onClick={() => setSidebarOpen(true)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, padding:'4px 8px', lineHeight:1 }} aria-label="Abrir menú">
                  ☰
                </button>
              )}
            <h2 style={{ margin:0, fontSize: isMobile ? 14 : 17, fontWeight:900, color:'#1e293b' }}>
              {[
                ['dashboard','Dashboard'],['menu','Menú del Día'],['dias','Días'],
                ['stock','Control de Stock'],['pedidos','Pedidos'],['clientes','Clientes'],
                ['contabilidad','Contabilidad'],['ajustes','Ajustes'],
              ].find(([id])=>id===tab)?.[1] ?? ''}
            </h2>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {unreadCount > 0 && (
                <div style={{ background:'#fff7ed', border:'1.5px solid #fed7aa', borderRadius:10,
                  padding:'4px 12px', fontSize:12, fontWeight:700, color:'#c2410c' }}>
                  🔔 {unreadCount} nuevo{unreadCount>1?'s':''} pedido{unreadCount>1?'s':''}
                </div>
              )}
              <div style={{ fontSize:12, color:'#475569' }}>
                {new Date().toLocaleDateString('es-BO', { weekday:'long', day:'numeric', month:'long' })}
              </div>
            </div>
          </div>

          {/* Tab content */}
          <div style={{ padding: isMobile ? 14 : 28 }}>
            {inTrial && trialDays > 0 && (
              <div style={{ background:'#fef3c7', border:'1px solid #f59e0b', borderRadius:10, padding:'10px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#92400e', fontWeight:600 }}>
                <span>⏳</span> Prueba gratuita: {trialDays} día{trialDays!==1?'s':''} restante{trialDays!==1?'s':''}. <span style={{ fontWeight:400 }}>Todas las funciones están habilitadas.</span>
              </div>
            )}
            {loading && <p style={{ textAlign:'center', color:'#475569', padding:40 }}>Cargando…</p>}

        {/* ── DASHBOARD ── */}
        {tab==='dashboard' && !loading && (<div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <h2 style={{ margin:0, fontSize:17, fontWeight:900 }}>Resumen General</h2>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setReportModal('dashboard')} style={{ padding:'8px 14px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:700,fontSize:12,background:'#e91e63',color:'#fff' }}>Ver Resumen</button>
              <button onClick={()=>setReportModal('pedidos')} style={{ padding:'8px 14px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:700,fontSize:12,background:'#1f2937',color:'#fff' }}>Ver Pedidos</button>
              <button onClick={()=>setReportModal('clientes')} style={{ padding:'8px 14px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:700,fontSize:12,background:'#6b7280',color:'#fff' }}>Ver Clientes</button>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:14, marginBottom:20 }}>
            {[{icon:'💰',label:'Total Recaudado',value:fmtCur(totalRev),color:'#22c55e'},{icon:'📋',label:'Total Pedidos',value:pedidos.length,color:'#3b82f6'},{icon:'🍽️',label:'En Local',value:localN,color:'#e91e63'},{icon:'📦',label:'Para Llevar',value:llevarN,color:'#8b5cf6'}].map((k,i)=>(
              <div key={i} style={{ background:'#fff',borderRadius:12,padding:18,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',border:'1px solid #e5e7eb',borderLeft:`4px solid ${k.color}` }}>
                <div style={{ fontSize:24 }}>{k.icon}</div>
                <div style={{ fontSize:22,fontWeight:900,margin:'4px 0' }}>{k.value}</div>
                <div style={{ fontSize:11,color:'#64748b',fontWeight:600 }}>{k.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap:14 }}>
            <div style={{ background:'#fff',borderRadius:12,padding:18,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',border:'1px solid #e5e7eb' }}>
              <h3 style={{ margin:'0 0 14px',fontSize:14,fontWeight:800 }}>Lo más vendido</h3>
              {topPlatos.length===0?<p style={{ color:'#475569',fontSize:13 }}>Sin datos</p>:topPlatos.slice(0,5).map((p,i)=>(<div key={i} style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}><span style={{ fontSize:13 }}>#{i+1} {p.plato}</span><span style={{ fontWeight:800,color:'#e91e63',fontSize:13 }}>{p.total_vendido}</span></div>))}
            </div>
            <div style={{ background:'#fff',borderRadius:12,padding:18,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',border:'1px solid #e5e7eb' }}>
              <h3 style={{ margin:'0 0 14px',fontSize:14,fontWeight:800 }}>Consumo</h3>
              {barRow('En Local 🍽️',localN,pedidos.length,'#3b82f6')}
              {barRow('Para Llevar 📦',llevarN,pedidos.length,'#8b5cf6')}
            </div>
            <div style={{ background:'#fff',borderRadius:12,padding:18,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',border:'1px solid #e5e7eb' }}>
              <h3 style={{ margin:'0 0 14px',fontSize:14,fontWeight:800 }}>Pago</h3>
              {barRow('Efectivo 💵',efecN,pedidos.length,'#22c55e')}
              {barRow('QR 📱',qrN,pedidos.length,'#3b82f6')}
            </div>
            <div style={{ background:'#fff',borderRadius:12,padding:18,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',border:'1px solid #e5e7eb',gridColumn:'1/-1' }}>
              <h3 style={{ margin:'0 0 14px',fontSize:14,fontWeight:800 }}>Ventas por Día</h3>
              <div style={{ display:'flex',gap:10,alignItems:'flex-end',height:110 }}>
                {ALL_DAYS.map(day=>{ const val=salesByDay[day]||0; const maxV=Math.max(...Object.values(salesByDay),1); const h=Math.round((val/maxV)*90); return (<div key={day} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}><span style={{ fontSize:9,fontWeight:700,color:'#e91e63' }}>{val>0?fmtCur(val):''}</span><div style={{ width:'100%',display:'flex',alignItems:'flex-end',height:80 }}><div style={{ width:'100%',height:`${h}%`,minHeight:4,background:'#e0e7ff',borderRadius:'6px 6px 0 0' }}/></div><span style={{ fontSize:10,fontWeight:700,color:'#64748b' }}>{day.slice(0,3)}</span></div>) })}
              </div>
            </div>
          </div>
        </div>)}

        {/* ── DÍAS ── */}
        {tab==='dias' && !loading && (<div>
          <h3 style={{ margin:'0 0 6px',fontWeight:800 }}>Habilitar / Deshabilitar Días</h3>
          <p style={{ color:'#64748b',fontSize:13,margin:'0 0 20px' }}>Los días deshabilitados no aparecen en el menú de tus clientes.</p>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:14 }}>
            {dias.sort((a,b)=>a.orden-b.orden).map(dia=>(
              <div key={dia.id} style={{ background:'#fff',borderRadius:12,padding:20,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',border:`2px solid ${dia.habilitado?'#bbf7d0':'#fca5a5'}` }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
                  <span style={{ fontWeight:900,fontSize:16 }}>{dia.nombre}</span>
                  <span style={{ fontSize:11,fontWeight:700,padding:'2px 10px',borderRadius:99,background:dia.habilitado?'#dcfce7':'#fee2e2',color:dia.habilitado?'#166534':'#991b1b' }}>{dia.habilitado?'ACTIVO':'OFF'}</span>
                </div>
                {!dia.habilitado && dia.mensaje_deshabilitado && (
                  <p style={{ fontSize:12,color:'#991b1b',background:'#fef2f2',padding:'6px 10px',borderRadius:8,margin:'0 0 10px',lineHeight:1.4 }}>{dia.mensaje_deshabilitado}</p>
                )}
                <button onClick={async()=>{
                  if(dia.habilitado){ setDisableMsg('Estimados clientes, les informamos que el día '+dia.nombre+' no habrá atención. Disculpen las molestias, mañana volveremos con atención normal.'); setDisableModal({dia}); return }
                  await toggleDia(dia.id,true)
                  setDias(prev=>prev.map(d=>d.id===dia.id?{...d,habilitado:true,mensaje_deshabilitado:undefined}:d))
                }} style={{ width:'100%',padding:'9px 0',borderRadius:12,border:'none',cursor:'pointer',fontWeight:700,color:'#fff',fontSize:13,background:dia.habilitado?'linear-gradient(135deg,#ef4444,#dc2626)':'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                  {dia.habilitado?'Deshabilitar':'Habilitar'}
                </button>
              </div>
            ))}
          </div>
          {disableModal && (<div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:16 }}>
            <div style={{ background:'#fff',borderRadius:12,padding:24,width:'100%',maxWidth:460 }}>
              <h3 style={{ margin:'0 0 4px',fontSize:17,fontWeight:800 }}>Deshabilitar {disableModal.dia.nombre}</h3>
              <p style={{ color:'#64748b',fontSize:13,margin:'0 0 16px' }}>Este mensaje se mostrará a tus clientes en la página pública.</p>
              <textarea value={disableMsg} onChange={e=>setDisableMsg(e.target.value)} rows={4} style={{ width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid #d1d5db',fontSize:14,boxSizing:'border-box',resize:'vertical',fontFamily:'inherit' }} />
              <div style={{ display:'flex',gap:10,marginTop:16,justifyContent:'flex-end' }}>
                <button onClick={()=>setDisableModal(null)} style={{ padding:'9px 20px',borderRadius:8,border:'1px solid #d1d5db',background:'#fff',fontWeight:600,cursor:'pointer',fontSize:13 }}>Cancelar</button>
                <button onClick={async()=>{
                  const d=disableModal.dia
                  await toggleDia(d.id,false,disableMsg)
                  setDias(prev=>prev.map(x=>x.id===d.id?{...x,habilitado:false,mensaje_deshabilitado:disableMsg}:x))
                  setDisableModal(null)
                }} style={{ padding:'9px 20px',borderRadius:8,border:'none',background:'#e91e63',color:'#fff',fontWeight:600,cursor:'pointer',fontSize:13 }}>Deshabilitar</button>
              </div>
            </div>
          </div>)}
        </div>)}

        {/* ── MENÚ ── */}
        {tab==='menu' && !loading && (<div>
          <div style={{ display:'flex',gap:8,marginBottom:18,flexWrap:'wrap' }}>
            {dias.sort((a,b)=>a.orden-b.orden).map(d=>(<button key={d.id} onClick={()=>setEditDay(d.nombre)} style={{ ...tabBtn(editDay===d.nombre),opacity:d.habilitado?1:0.5 }}>{d.nombre}{!d.habilitado?' 🚫':''}</button>))}
          </div>
          {([['sopas','sopa','Sopas'],['segundos','segundo','Segundos'],['extras','extra','Extra']] as const).map(([_arr,cat,catLabel])=>{
            const items=cat==='sopa'?sopas:cat==='segundo'?segundos:extras
            return (<div key={cat} style={{ marginBottom:24 }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
                <h3 style={{ margin:0,fontSize:15,fontWeight:800 }}>{catLabel}</h3>
                <button onClick={()=>{ setNewForm({categoria:cat,stock:20,stock_inicial:20,precio:10,emoji:'🍽️'}); setShowNew(true) }} style={{ background:'#e91e63',color:'#fff',border:'none',borderRadius:10,padding:'5px 12px',cursor:'pointer',fontWeight:700,fontSize:12 }}>+ Agregar</button>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:12 }}>
                {items.map(item=>(<div key={item.id} style={{ background:'#fff',borderRadius:14,padding:16,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',border:'1px solid #e5e7eb' }}>
                  <div style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}>
                    <span style={{ fontSize:24 }}>{item.emoji}</span>
                    <div style={{ display:'flex',gap:6 }}>
                      <button onClick={()=>{ setEditItem(item); setEditForm({...item}) }} style={{ background:'#f1f5f9',border:'none',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:11,fontWeight:700 }}>✏️</button>
                      <button onClick={async()=>{ if(!confirm('¿Eliminar?')) return; await deletePlato(item.id); setPlatos(prev=>prev.filter(p=>p.id!==item.id)) }} style={{ background:'#fee2e2',border:'none',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:11,color:'#ef4444',fontWeight:700 }}>🗑️</button>
                    </div>
                  </div>
                  <div style={{ fontWeight:800,fontSize:14,marginBottom:2 }}>{item.nombre}</div>
                  <div style={{ fontSize:12,color:'#64748b',marginBottom:6 }}>{item.descripcion}</div>
                  <div style={{ display:'flex',justifyContent:'space-between',fontSize:13 }}>
                    <span style={{ fontWeight:900,color:'#e91e63' }}>{fmtCur(item.precio)}</span>
                    <span style={{ color:'#64748b' }}>Stock: <strong>{item.stock}/{item.stock_inicial}</strong></span>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:6 }}>
                    <div style={{ flex:1,height:6,background:'#e5e7eb',borderRadius:99 }}><div style={{ width:`${item.stock_inicial>0?(item.stock/item.stock_inicial)*100:0}%`,height:'100%',background:item.stock===0?'#ef4444':item.stock/item.stock_inicial>0.5?'#22c55e':'#f59e0b',borderRadius:99 }}/></div>
                    <span style={{ fontSize:10,fontWeight:700,color:item.stock===0?'#ef4444':'#22c55e' }}>{item.stock===0?'AGOTADO':`${item.stock} disp.`}</span>
                  </div>
                </div>))}
              </div>
            </div>)
          })}
        </div>)}

        {/* ── PEDIDOS ── */}
        {tab==='pedidos' && !loading && (<div style={{ background:'#fff',borderRadius:12,padding: isMobile ? 14 : 22,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',border:'1px solid #e5e7eb' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18,flexWrap:'wrap',gap:10 }}>
            <h3 style={{ margin:0,fontSize:16,fontWeight:800 }}>Registro de Pedidos</h3>
            <input value={pedidoSearch} onChange={e=>setPedidoSearch(e.target.value)} placeholder="Buscar por código, cliente, WhatsApp, día..." style={{ padding:'8px 14px',borderRadius:8,border:'1px solid #d1d5db',fontSize:13,width: isMobile ? '100%' : 280,outline:'none' }} />
          </div>
          {pedidos.length===0?<div style={{ textAlign:'center',padding:48,color:'#9ca3af' }}><div style={{ fontSize:40,marginBottom:8 }}>📋</div><p style={{ fontWeight:600,color:'#6b7280',margin:'0 0 4px' }}>No hay pedidos registrados</p><p style={{ fontSize:13,margin:0 }}>Los pedidos de tus clientes aparecerán aquí en tiempo real.</p></div>:(()=>{
            const q=pedidoSearch.toLowerCase().trim()
            const filtered=q?pedidos.filter(o=>[o.codigo,o.cliente?.nombre,o.cliente?.apellido,o.cliente?.whatsapp,o.dia?.nombre,o.hora_recojo,o.consumo,o.metodo_pago,o.estado,o.detalle?.map(d=>d.nombre).join(' ')].some(v=>v?.toLowerCase().includes(q))):pedidos
            return (<>
            {isMobile && <p style={{ fontSize:11, color:'#475569', margin:'0 0 8px', fontStyle:'italic' }}>Desliza para ver mas →</p>}
            {q && <p style={{ fontSize:12,color:'#6b7280',marginBottom:8 }}>{filtered.length} resultado{filtered.length!==1?'s':''}</p>}
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%',borderCollapse:'collapse' }}>
                <thead><tr style={{ background:'#f8fafc' }}>{['Código','Fecha','Día','Cliente','WhatsApp','Pedido','Hora','Consumo','Pago','Total','Estado'].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead>
                <tbody>{filtered.map((o,i)=>(<tr key={o.id} style={rowBg(i)}>
                  <td style={{ ...td,fontWeight:700 }}>{o.codigo}</td>
                  <td style={td}>{new Date(o.creado_en).toLocaleDateString('es-BO')}</td>
                  <td style={{ ...td,fontWeight:700 }}>{o.dia?.nombre||'—'}</td>
                  <td style={{ ...td,fontWeight:700 }}>{o.cliente?`${o.cliente.nombre} ${o.cliente.apellido}`:'—'}</td>
                  <td style={td}>{o.cliente?.whatsapp?<a href={`https://wa.me/591${o.cliente.whatsapp}`} target="_blank" rel="noreferrer" style={{ color:'#22c55e',fontWeight:700,textDecoration:'none' }}>📱 {o.cliente.whatsapp}</a>:'—'}</td>
                  <td style={{ ...td,fontSize:11,maxWidth:200 }}>{o.detalle?.length?o.detalle.map((d,j)=><div key={j} style={{ whiteSpace:'nowrap' }}>{d.cantidad}x {d.nombre}</div>):'—'}</td>
                  <td style={{ ...td,color:'#7c3aed',fontWeight:700 }}>{o.hora_recojo?`🕐 ${o.hora_recojo}`:'—'}</td>
                  <td style={td}><span style={{ background:o.consumo==='local'?'#eff6ff':'#f5f3ff',color:o.consumo==='local'?'#1d4ed8':'#6d28d9',padding:'2px 8px',borderRadius:99,fontWeight:700,fontSize:11 }}>{o.consumo==='local'?'🍽️ Local':'📦 Llevar'}</span></td>
                  <td style={td}><span style={{ background:o.metodo_pago==='efectivo'?'#f0fdf4':'#eff6ff',color:o.metodo_pago==='efectivo'?'#166534':'#1e40af',padding:'2px 8px',borderRadius:99,fontWeight:700,fontSize:11 }}>{o.metodo_pago==='efectivo'?'💵 Efectivo':'📱 QR'}</span></td>
                  <td style={{ ...td,fontWeight:900,color:'#e91e63' }}>{fmtCur(Number(o.total))}</td>
                  <td style={td}>
                    {(()=>{
                      const est=o.estado||'pendiente'
                      const flow=['pendiente','confirmado','preparando','listo','entregado']
                      const labels:{[k:string]:{bg:string,color:string,text:string}}={
                        pendiente:{bg:'#f1f5f9',color:'#374151',text:'Pendiente'},
                        confirmado:{bg:'#e0e7ff',color:'#3730a3',text:'Confirmado'},
                        preparando:{bg:'#fef3c7',color:'#92400e',text:'Preparando'},
                        listo:{bg:'#dbeafe',color:'#1d4ed8',text:'Listo'},
                        entregado:{bg:'#dcfce7',color:'#166534',text:'Entregado'},
                        cancelado:{bg:'#fee2e2',color:'#991b1b',text:'Cancelado'},
                      }
                      const s=labels[est]||labels.pendiente
                      const idx=flow.indexOf(est)
                      const next=idx>=0&&idx<flow.length-1?flow[idx+1]:null
                      const advance=async(newEst:string)=>{try{await updatePedidoEstado(o.id,newEst);setPedidos(prev=>prev.map(p=>p.id===o.id?{...p,estado:newEst}:p))}catch(err:any){alert('Error al cambiar estado: '+(err.message||err))}}
                      return (<div style={{ display:'flex',flexDirection:'column',gap:4,alignItems:'flex-start' }}>
                        <span style={{ background:s.bg,color:s.color,padding:'3px 10px',borderRadius:99,fontWeight:700,fontSize:11,whiteSpace:'nowrap' }}>{s.text}</span>
                        {est!=='entregado'&&est!=='cancelado'&&(<div style={{ display:'flex',gap:3 }}>
                          {next&&<button onClick={()=>advance(next)} style={{ padding:'2px 8px',borderRadius:6,border:'none',background:'#e91e63',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap' }}>{labels[next].text} →</button>}
                          <button onClick={()=>advance('cancelado')} style={{ padding:'2px 6px',borderRadius:6,border:'none',background:'#fee2e2',color:'#991b1b',fontSize:10,fontWeight:700,cursor:'pointer' }}>✕</button>
                        </div>)}
                      </div>)
                    })()}
                  </td>
                </tr>))}</tbody>
              </table>
            </div>
          </>)
          })()}
        </div>)}

        {/* ── CLIENTES ── */}
        {tab==='clientes' && !loading && (<div style={{ background:'#fff',borderRadius:12,padding: isMobile ? 14 : 22,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',border:'1px solid #e5e7eb' }}>
          <h3 style={{ margin:'0 0 6px',fontSize:16,fontWeight:800 }}>Base de Datos de Clientes</h3>
          <p style={{ color:'#64748b',fontSize:13,margin:'0 0 18px' }}>Identificados por WhatsApp. El contador sube automáticamente con cada pedido.</p>
          {clientes.length===0?<div style={{ textAlign:'center',padding:48,color:'#9ca3af' }}><div style={{ fontSize:40,marginBottom:8 }}>👥</div><p style={{ fontWeight:600,color:'#6b7280',margin:'0 0 4px' }}>No hay clientes registrados</p><p style={{ fontSize:13,margin:0 }}>Cuando los clientes hagan pedidos, aparecerán aquí automáticamente.</p></div>:(<>
            {isMobile && <p style={{ fontSize:11, color:'#475569', margin:'0 0 8px', fontStyle:'italic' }}>Desliza para ver mas →</p>}
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%',borderCollapse:'collapse' }}>
                <thead><tr style={{ background:'#f8fafc' }}>{['#','Nombre','Apellido','WhatsApp','Pedidos','Último Pedido'].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead>
                <tbody>{[...clientes].sort((a,b)=>(b.total_pedidos||0)-(a.total_pedidos||0)).map((c,i)=>{
                  return (
                    <tr key={c.id} style={rowBg(i)}>
                      <td style={{ ...td,color:'#475569',fontWeight:700 }}>{i+1}</td>
                      <td style={{ ...td,fontWeight:800 }}>{c.nombre}</td>
                      <td style={td}>{c.apellido}</td>
                      <td style={td}><a href={'https://wa.me/591' + c.whatsapp} target="_blank" rel="noreferrer" style={{ color:'#22c55e',fontWeight:700,textDecoration:'none' }}>📱 {c.whatsapp}</a></td>
                      <td style={td}><span style={{ background:(c.total_pedidos||0)>=5?'#fef3c7':(c.total_pedidos||0)>=3?'#eff6ff':'#f1f5f9',color:(c.total_pedidos||0)>=5?'#92400e':(c.total_pedidos||0)>=3?'#1d4ed8':'#374151',borderRadius:99,padding:'3px 12px',fontWeight:900,fontSize:13 }}>{(c.total_pedidos||0)>=5?'⭐':(c.total_pedidos||0)>=3?'🔵':'🔢'} {c.total_pedidos||0} pedido{(c.total_pedidos||0)!==1?'s':''}</span></td>
                      <td style={{ ...td,color:'#64748b',fontSize:12 }}>{c.ultimo_pedido?new Date(c.ultimo_pedido).toLocaleDateString('es-BO'):'—'}</td>
                    </tr>
                  )
                })}</tbody>
              </table>
            </div>
          </>)}
        </div>)}

        {/* ── STOCK ── */}
        {tab==='stock' && !loading && (<div>
          {/* Header with reset button */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <div>
              <h2 style={{ margin:'0 0 4px', fontSize:17, fontWeight:900 }}>Control de Stock</h2>
              <p style={{ margin:0, fontSize:13, color:'#64748b' }}>
                Visualiza y ajusta manualmente el stock de cada plato. El reseteo automático ocurre cada día a las 6:00 AM.
              </p>
            </div>
            <button
              onClick={handleResetStock}
              disabled={resettingStock}
              style={{ padding:'10px 20px', borderRadius:12, border:'none', cursor:resettingStock?'not-allowed':'pointer',
                fontWeight:800, fontSize:14, color:'#fff',
                background:resettingStock?'#94a3b8':'#e91e63',
                boxShadow:'none',
                display:'flex', alignItems:'center', gap:8 }}>
              {resettingStock ? 'Reseteando...' : 'Resetear Stock del Día'}
            </button>
          </div>

          {resetMsg && (
            <div style={{ padding:'10px 16px', borderRadius:12, marginBottom:16, fontWeight:700, fontSize:13,
              background: resetMsg.startsWith('✅')?'#f0fdf4':'#fef2f2',
              color: resetMsg.startsWith('✅')?'#166534':'#dc2626',
              border: `1.5px solid ${resetMsg.startsWith('✅')?'#bbf7d0':'#fca5a5'}` }}>
              {resetMsg}
            </div>
          )}

          {/* Info card */}
          <div style={{ background:'#fffbeb', border:'2px solid #fde68a', borderRadius:14, padding:'12px 18px', marginBottom:20, display:'flex', alignItems:'flex-start', gap:12 }}>
            <span style={{ fontSize:22 }}>💡</span>
            <div style={{ fontSize:13, color:'#92400e' }}>
              <strong>Reseteo automático:</strong> cada día a las 6:00 AM (Bolivia) todos los platos vuelven a su stock inicial.<br/>
              <strong>Reseteo manual:</strong> usa el botón "Resetear Stock del Día" si necesitas hacerlo en cualquier momento.<br/>
              <strong>Ajuste individual:</strong> puedes editar el stock de cada plato haciendo clic en el número.
            </div>
          </div>

          {/* Stock table grouped by day */}
          {(() => {
            const grouped: Record<string, any[]> = {}
            stockData.forEach((p: any) => {
              const dayName = p.dias?.nombre ?? 'Sin día'
              if (!grouped[dayName]) grouped[dayName] = []
              grouped[dayName].push(p)
            })
            const catColors: Record<string,string> = { sopa:'#3b82f6', segundo:'#e91e63', extra:'#8b5cf6' }
            const catLabels: Record<string,string> = { sopa:'Sopa', segundo:'Segundo', extra:'Extra' }

            return Object.entries(grouped).map(([dayName, items]) => (
              <div key={dayName} style={{ background:'#fff', borderRadius:12, padding:20, boxShadow:'0 1px 3px rgba(0,0,0,0.04)',border:'1px solid #e5e7eb', marginBottom:16 }}>
                <h3 style={{ margin:'0 0 14px', fontSize:15, fontWeight:800, color:'#1e293b', display:'flex', alignItems:'center', gap:8 }}>
                  {dayName}
                  <span style={{ fontSize:12, fontWeight:600, color:'#64748b' }}>({items.length} platos)</span>
                </h3>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ background:'#f8fafc' }}>
                        {['Plato','Categoría','Stock Actual','Stock Inicial','Estado','Acción'].map(h=>(
                          <th key={h} style={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((p: any, i: number) => {
                        const pct = p.stock_inicial > 0 ? (p.stock / p.stock_inicial) * 100 : 0
                        const col = pct > 50 ? '#22c55e' : pct > 20 ? '#f59e0b' : '#ef4444'
                        const isEditing = editingStock[p.id] !== undefined
                        return (
                          <tr key={p.id} style={rowBg(i)}>
                            <td style={{ ...td, fontWeight:700 }}><div style={{ display:'flex',alignItems:'center',gap:8 }}>{p.imagen_url?<img src={p.imagen_url} alt="" style={{ width:32,height:32,borderRadius:6,objectFit:'cover' }}/>:<span>{p.emoji}</span>}<span>{p.nombre}</span></div></td>
                            <td style={td}>
                              <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99,
                                background:`${catColors[p.categoria]}18`, color:catColors[p.categoria] }}>
                                {catLabels[p.categoria]}
                              </span>
                            </td>
                            <td style={td}>
                              {isEditing ? (
                                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                  <input
                                    type="number" min={0} max={p.stock_inicial}
                                    value={editingStock[p.id]}
                                    onChange={e => setEditingStock(prev => ({...prev, [p.id]: parseInt(e.target.value)||0}))}
                                    style={{ width:70, padding:'4px 8px', borderRadius:8, border:'2px solid #e91e63', fontSize:13, fontWeight:700 }}
                                    autoFocus
                                  />
                                  <button onClick={()=>handleUpdateStock(p.id, editingStock[p.id])}
                                    style={{ padding:'4px 10px', borderRadius:8, border:'none', background:'#e91e63', color:'#fff', fontWeight:800, cursor:'pointer', fontSize:12 }}>✓</button>
                                  <button onClick={()=>setEditingStock(prev=>{const n={...prev};delete n[p.id];return n})}
                                    style={{ padding:'4px 8px', borderRadius:8, border:'none', background:'#f1f5f9', color:'#64748b', fontWeight:700, cursor:'pointer', fontSize:12 }}>✕</button>
                                </div>
                              ) : (
                                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                                <button onClick={()=>handleUpdateStock(p.id, Math.max(0, p.stock - 1))}
                                  style={{ width:26, height:26, borderRadius:'50%', border:'1.5px solid #e2e8f0', background:'#f8fafc', cursor:'pointer', fontWeight:900, fontSize:14, color:'#ef4444', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}
                                  title="-1">−</button>
                                <button onClick={()=>setEditingStock(prev=>({...prev,[p.id]:p.stock}))}
                                  style={{ fontWeight:900, fontSize:16, color:col, background:'none', border:'none', cursor:'pointer', padding:'2px 6px', borderRadius:8, transition:'background 0.15s', minWidth:30, textAlign:'center' as const }}
                                  title="Clic para editar">
                                  {p.stock}
                                </button>
                                <button onClick={()=>handleUpdateStock(p.id, Math.min(p.stock_inicial, p.stock + 1))}
                                  style={{ width:26, height:26, borderRadius:'50%', border:'1.5px solid #e2e8f0', background:'#f8fafc', cursor:'pointer', fontWeight:900, fontSize:14, color:'#22c55e', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}
                                  title="+1">+</button>
                              </div>
                              )}
                            </td>
                            <td style={{ ...td, color:'#64748b', fontWeight:600 }}>{p.stock_inicial}</td>
                            <td style={td}>
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <div style={{ width:80, height:8, background:'#e5e7eb', borderRadius:99, overflow:'hidden' }}>
                                  <div style={{ width:`${pct}%`, height:'100%', background:col, borderRadius:99 }}/>
                                </div>
                                <span style={{ fontSize:11, fontWeight:700, color:col, whiteSpace:'nowrap' }}>
                                  {p.stock===0 ? 'AGOTADO' : `${Math.round(pct)}%`}
                                </span>
                              </div>
                            </td>
                            <td style={td}>
                              <button
                                onClick={async()=>{
                                  await updateStock(p.id, p.stock_inicial)
                                  setStockData(prev=>prev.map(x=>x.id===p.id?{...x,stock:x.stock_inicial}:x))
                                  setPlatos(prev=>prev.map(x=>x.id===p.id?{...x,stock:x.stock_inicial}:x))
                                }}
                                title="Restaurar al stock inicial"
                                style={{ padding:'4px 10px', borderRadius:8, border:'none', background:'#eff6ff',
                                  color:'#1d4ed8', fontWeight:700, cursor:'pointer', fontSize:11 }}>
                                ↺ Restaurar
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          })()}

          {stockData.length === 0 && (
            <p style={{ color:'#475569', textAlign:'center', padding:40 }}>
              No hay platos configurados aún. Ve a Menú para agregar platos.
            </p>
          )}
        </div>)}

        {/* ── CONTABILIDAD ── */}
        {tab==='contabilidad' && !loading && (<div>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
            <h2 style={{ margin:0,fontSize:17,fontWeight:900 }}>Contabilidad</h2>
          </div>
          <div style={{ display:'grid',gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)',gap:14,marginBottom:20 }}>
            {[{icon:'💰',label:'Total Histórico',value:fmtCur(contMensual.reduce((s:number,r:any)=>s+Number(r.total_recaudado),0)||totalRev),color:'#e91e63'},
              {icon:'💵',label:'Efectivo',value:fmtCur(contMensual.reduce((s:number,r:any)=>s+Number(r.total_efectivo),0)),color:'#22c55e'},
              {icon:'📱',label:'QR',value:fmtCur(contMensual.reduce((s:number,r:any)=>s+Number(r.total_qr),0)),color:'#3b82f6'},
            ].map((k,i)=>(<div key={i} style={{ background:'#fff',borderRadius:12,padding:20,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',border:'1px solid #e5e7eb',borderLeft:`4px solid ${k.color}` }}><div style={{ fontSize:26 }}>{k.icon}</div><div style={{ fontSize:22,fontWeight:900,margin:'4px 0' }}>{k.value}</div><div style={{ fontSize:12,color:'#64748b',fontWeight:600 }}>{k.label}</div></div>))}
          </div>

          {/* Diaria */}
          {(()=>{ const rows=contDiaria; const data=rows.map((r:any)=>[r.fecha,r.total_pedidos,r.total_efectivo,r.total_qr,r.total_recaudado]); return (
            <div style={{ background:'#fff',borderRadius:12,padding:22,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',border:'1px solid #e5e7eb',marginBottom:20 }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
                <h3 style={{ margin:0,fontSize:15,fontWeight:800 }}>Recaudación Diaria</h3>
                <button onClick={()=>{if(!canAccess('csv')){alert('Exportar CSV requiere el plan Premium.');return}downloadCSV(`contabilidad_diario.csv`,['Período','Pedidos','Efectivo','QR','Total'],data)}} style={{ padding:'7px 14px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:700,fontSize:12,background:'#e91e63',color:'#fff' }}>Descargar</button>
              </div>
              {rows.length===0?<p style={{ color:'#475569',fontSize:13 }}>Sin datos aún.</p>:(
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%',borderCollapse:'collapse' }}>
                    <thead><tr style={{ background:'#f8fafc' }}>{['Fecha','Pedidos','Efectivo','QR','Total'].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead>
                    <tbody>{rows.map((r:any,i:number)=>(<tr key={i} style={rowBg(i)}>
                      <td style={{ ...td,fontWeight:700 }}>{r.fecha}</td>
                      <td style={td}>{r.total_pedidos}</td>
                      <td style={{ ...td,color:'#166534',fontWeight:700 }}>{fmtCur(Number(r.total_efectivo))}</td>
                      <td style={{ ...td,color:'#1e40af',fontWeight:700 }}>{fmtCur(Number(r.total_qr))}</td>
                      <td style={{ ...td,fontWeight:900,color:'#e91e63',fontSize:14 }}>{fmtCur(Number(r.total_recaudado))}</td>
                    </tr>))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )})()}

          {/* Semanal */}
          {(()=>{ const rows=contSemanal.map((r:any)=>({...r,fecha:`${r.semana_inicio}–${r.semana_fin}`})); const data=rows.map((r:any)=>[r.fecha,r.total_pedidos,r.total_efectivo,r.total_qr,r.total_recaudado]); return (
            <div style={{ background:'#fff',borderRadius:12,padding:22,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',border:'1px solid #e5e7eb',marginBottom:20 }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
                <h3 style={{ margin:0,fontSize:15,fontWeight:800 }}>Recaudación Semanal</h3>
                <button onClick={()=>{if(!canAccess('csv')){alert('Exportar CSV requiere el plan Premium.');return}downloadCSV(`contabilidad_semanal.csv`,['Período','Pedidos','Efectivo','QR','Total'],data)}} style={{ padding:'7px 14px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:700,fontSize:12,background:'#1f2937',color:'#fff' }}>Descargar</button>
              </div>
              {rows.length===0?<p style={{ color:'#475569',fontSize:13 }}>Sin datos aún.</p>:(
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%',borderCollapse:'collapse' }}>
                    <thead><tr style={{ background:'#f8fafc' }}>{['Semana','Pedidos','Efectivo','QR','Total'].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead>
                    <tbody>{rows.map((r:any,i:number)=>(<tr key={i} style={rowBg(i)}>
                      <td style={{ ...td,fontWeight:700 }}>{r.fecha}</td>
                      <td style={td}>{r.total_pedidos}</td>
                      <td style={{ ...td,color:'#166534',fontWeight:700 }}>{fmtCur(Number(r.total_efectivo))}</td>
                      <td style={{ ...td,color:'#1e40af',fontWeight:700 }}>{fmtCur(Number(r.total_qr))}</td>
                      <td style={{ ...td,fontWeight:900,color:'#e91e63',fontSize:14 }}>{fmtCur(Number(r.total_recaudado))}</td>
                    </tr>))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )})()}

          {/* Mensual */}
          {(()=>{ const rows=contMensual.map((r:any)=>({...r,fecha:r.mes})); const data=rows.map((r:any)=>[r.fecha,r.total_pedidos,r.total_efectivo,r.total_qr,r.total_recaudado]); return (
            <div style={{ background:'#fff',borderRadius:12,padding:22,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',border:'1px solid #e5e7eb',marginBottom:20 }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
                <h3 style={{ margin:0,fontSize:15,fontWeight:800 }}>Recaudación Mensual</h3>
                <button onClick={()=>{if(!canAccess('csv')){alert('Exportar CSV requiere el plan Premium.');return}downloadCSV(`contabilidad_mensual.csv`,['Período','Pedidos','Efectivo','QR','Total'],data)}} style={{ padding:'7px 14px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:700,fontSize:12,background:'#e91e63',color:'#fff' }}>Descargar</button>
              </div>
              {rows.length===0?<p style={{ color:'#475569',fontSize:13 }}>Sin datos aún.</p>:(
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%',borderCollapse:'collapse' }}>
                    <thead><tr style={{ background:'#f8fafc' }}>{['Mes','Pedidos','Efectivo','QR','Total'].map(h=>(<th key={h} style={th}>{h}</th>))}</tr></thead>
                    <tbody>{rows.map((r:any,i:number)=>(<tr key={i} style={rowBg(i)}>
                      <td style={{ ...td,fontWeight:700 }}>{r.fecha}</td>
                      <td style={td}>{r.total_pedidos}</td>
                      <td style={{ ...td,color:'#166634',fontWeight:700 }}>{fmtCur(Number(r.total_efectivo))}</td>
                      <td style={{ ...td,color:'#1e40af',fontWeight:700 }}>{fmtCur(Number(r.total_qr))}</td>
                      <td style={{ ...td,fontWeight:900,color:'#e91e63',fontSize:14 }}>{fmtCur(Number(r.total_recaudado))}</td>
                    </tr>))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )})()}
        </div>)}

        {/* ── AJUSTES ── */}
        {tab==='ajustes' && (<div style={{ maxWidth:560 }}>
          <h3 style={{ margin:'0 0 20px',fontWeight:800 }}>Ajustes del Restaurante</h3>

          {/* Información del negocio */}
          <div style={{ background:'#fff',borderRadius:12,padding:24,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',border:'1px solid #e5e7eb',marginBottom:20 }}>
            <h4 style={{ margin:'0 0 16px',fontWeight:800,color:'#374151' }}>Información del Negocio</h4>
            {[{k:'nombre',l:'Nombre'},{k:'descripcion',l:'Descripción'},{k:'telefono',l:'Teléfono'},{k:'ciudad',l:'Ciudad'},{k:'direccion',l:'Dirección'}].map(({k,l})=>(
              <div key={k} style={{ marginBottom:14 }}>
                <label style={{ fontSize:13,fontWeight:700,display:'block',marginBottom:5 }}>{l}</label>
                <input value={(restForm as any)[k]} onChange={e=>setRestForm(p=>({...p,[k]:e.target.value}))} style={inp} />
              </div>
            ))}
            <button onClick={async()=>{ await updateRestaurante(restForm); await refreshSession(); alert('Guardado ✓') }} style={{ width:'100%',padding:12,borderRadius:12,border:'none',background:'#e91e63',color:'#fff',fontWeight:800,cursor:'pointer' }}>Guardar Cambios</button>
          </div>

          {/* Mi Plan */}
          <div style={{ background:'#fff',borderRadius:12,padding:24,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',border:'1px solid #e5e7eb',marginBottom:20 }}>
            <h4 style={{ margin:'0 0 16px',fontWeight:800,color:'#374151' }}>Mi Plan</h4>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12 }}>
              {([
                { id:'starter' as const, name:'Starter', price:'49', features:['Menú semanal','Hasta 100 pedidos/mes','Control de stock','Estado de pedidos'] },
                { id:'negocio' as const, name:'Negocio', price:'99', features:['Todo de Starter','Pedidos ilimitados','Base de clientes','Contabilidad y reportes'] },
                { id:'premium' as const, name:'Premium', price:'249', features:['Todo de Negocio','Exportar CSV','Soporte prioritario','Funciones futuras'] },
              ]).map(p=>{
                const isCurrent = plan === p.id
                const isUpgrade = (['starter','negocio','premium'] as const).indexOf(p.id) > (['starter','negocio','premium'] as const).indexOf(plan)
                return (
                <div key={p.id} style={{ borderRadius:10,padding:16,border: isCurrent ? '2px solid #e91e63' : '1px solid #e5e7eb',background: isCurrent ? '#fef1f5' : '#fff',position:'relative' as const }}>
                  {isCurrent && <span style={{ position:'absolute' as const,top:-10,left:'50%',transform:'translateX(-50%)',background:'#e91e63',color:'#fff',fontSize:9,fontWeight:800,padding:'2px 10px',borderRadius:99 }}>ACTUAL</span>}
                  <div style={{ fontWeight:800,fontSize:15,color:'#1f2937',marginBottom:4 }}>{p.name}</div>
                  <div style={{ marginBottom:12 }}><span style={{ fontSize:24,fontWeight:800,color:'#1f2937' }}>{p.price}</span><span style={{ fontSize:12,color:'#6b7280' }}> Bs/mes</span></div>
                  <ul style={{ listStyle:'none',padding:0,margin:'0 0 14px' }}>
                    {p.features.map((f,i)=><li key={i} style={{ fontSize:11,color:'#4b5563',padding:'3px 0',display:'flex',alignItems:'center',gap:6 }}><span style={{ color:'#22c55e',fontWeight:900 }}>✓</span>{f}</li>)}
                  </ul>
                  {isUpgrade && (
                    <button onClick={()=>{const msg=`Hola, quiero cambiar mi plan a ${p.name} (${p.price} Bs/mes). Mi restaurante: ${rest?.nombre ?? ''} (${rest?.slug ?? ''})`;window.open(`https://wa.me/59176806091?text=${encodeURIComponent(msg)}`,'_blank')}} style={{ width:'100%',padding:8,borderRadius:8,border:'none',background:'#e91e63',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer' }}>
                      Subir a {p.name}
                    </button>
                  )}
                  {isCurrent && !inTrial && <div style={{ textAlign:'center',fontSize:11,color:'#e91e63',fontWeight:700,marginTop:4 }}>Plan activo</div>}
                  {isCurrent && inTrial && <div style={{ textAlign:'center',fontSize:11,color:'#f59e0b',fontWeight:700,marginTop:4 }}>Prueba gratis — {trialDays} días</div>}
                </div>
              )})}
            </div>
            {inTrial && <p style={{ fontSize:12,color:'#6b7280',marginTop:12,textAlign:'center' }}>Durante la prueba gratuita todas las funciones están habilitadas. Al terminar, se aplicarán las restricciones de tu plan.</p>}
          </div>

          {/* Logo del Restaurante */}
          <div style={{ background:'#fff',borderRadius:12,padding:24,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',border:'1px solid #e5e7eb',marginBottom:20 }}>
            <h4 style={{ margin:'0 0 6px',fontWeight:800,color:'#374151' }}>Logo del Restaurante</h4>
            <p style={{ fontSize:13,color:'#64748b',margin:'0 0 16px' }}>
              Sube el logotipo de tu negocio. Se mostrará en el menú público y en el panel de administración.
            </p>
            {rest?.logo_url && (
              <div style={{ marginBottom:16,textAlign:'center' }}>
                <p style={{ fontSize:12,fontWeight:700,color:'#64748b',marginBottom:8 }}>Logo actual:</p>
                <img src={rest.logo_url} alt="Logo del restaurante" style={{ maxWidth:150,maxHeight:150,borderRadius:12,border:'2px solid #e2e8f0',objectFit:'contain' }} />
              </div>
            )}
            <div
              onClick={() => logoFileRef.current?.click()}
              style={{ border:'2px dashed #cbd5e1',borderRadius:12,padding:28,textAlign:'center',cursor:'pointer',background:'#f8fafc',marginBottom:12 }}
            >
              <div style={{ fontSize:36,marginBottom:8 }}>{uploadingLogo ? '⏳' : '🖼️'}</div>
              <p style={{ margin:0,fontWeight:700,color:'#374151',fontSize:14 }}>
                {uploadingLogo ? 'Subiendo imagen...' : rest?.logo_url ? 'Clic para cambiar el logo' : 'Clic para subir tu logo'}
              </p>
              <p style={{ margin:'4px 0 0',fontSize:11,color:'#475569' }}>PNG, JPG o WEBP · Máximo 2 MB</p>
            </div>
            <input
              ref={logoFileRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              style={{ display:'none' }}
              onChange={handleLogoUpload}
            />
            {logoError && <p style={{ color:'#ef4444',fontSize:13,fontWeight:600 }}>⚠️ {logoError}</p>}
            {logoSuccess && <p style={{ color:'#22c55e',fontSize:13,fontWeight:600 }}>✅ Logo actualizado correctamente</p>}
          </div>

          {/* QR de Pago */}
          <div style={{ background:'#fff',borderRadius:12,padding:24,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',border:'1px solid #e5e7eb',marginBottom:20 }}>
            <h4 style={{ margin:'0 0 6px',fontWeight:800,color:'#374151' }}>QR de Pago</h4>
            <p style={{ fontSize:13,color:'#64748b',margin:'0 0 16px' }}>
              Sube la imagen de tu QR de pago (transferencia bancaria, QR Simple, etc). Los clientes podrán verla y descargarla al pagar.
            </p>
            {/* Current QR preview */}
            {rest?.qr_url && (
              <div style={{ marginBottom:16,textAlign:'center' }}>
                <p style={{ fontSize:12,fontWeight:700,color:'#64748b',marginBottom:8 }}>QR actual:</p>
                <img src={rest.qr_url} alt="QR de pago" style={{ maxWidth:200,maxHeight:200,borderRadius:12,border:'2px solid #e2e8f0',objectFit:'contain' }} />
              </div>
            )}
            {/* Upload area */}
            <div
              onClick={() => qrFileRef.current?.click()}
              style={{ border:'2px dashed #cbd5e1',borderRadius:12,padding:28,textAlign:'center',cursor:'pointer',background:'#f8fafc',marginBottom:12 }}
            >
              <div style={{ fontSize:36,marginBottom:8 }}>{uploadingQr ? '⏳' : '📷'}</div>
              <p style={{ margin:0,fontWeight:700,color:'#374151',fontSize:14 }}>
                {uploadingQr ? 'Subiendo imagen...' : rest?.qr_url ? 'Clic para cambiar el QR' : 'Clic para subir tu QR de pago'}
              </p>
              <p style={{ margin:'4px 0 0',fontSize:11,color:'#475569' }}>PNG, JPG o WEBP · Máximo 2 MB</p>
            </div>
            <input
              ref={qrFileRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              style={{ display:'none' }}
              onChange={handleQrUpload}
            />
            {qrError && <p style={{ color:'#ef4444',fontSize:13,fontWeight:600 }}>⚠️ {qrError}</p>}
            {qrSuccess && <p style={{ color:'#22c55e',fontSize:13,fontWeight:600 }}>✅ QR actualizado correctamente</p>}
          </div>

          {/* Horario de atención */}
          <div style={{ background:'#fff',borderRadius:12,padding:24,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',border:'1px solid #e5e7eb',marginBottom:20 }}>
            <h4 style={{ margin:'0 0 6px',fontWeight:800,color:'#374151' }}>Horario de Atención</h4>
            <p style={{ fontSize:13,color:'#64748b',margin:'0 0 16px' }}>Los clientes solo podrán hacer pedidos dentro de este horario.</p>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14 }}>
              <div>
                <label style={{ fontSize:13,fontWeight:700,display:'block',marginBottom:5 }}>Apertura</label>
                <input type="time" value={horario.hora_apertura} onChange={e=>setHorario(p=>({...p,hora_apertura:e.target.value}))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize:13,fontWeight:700,display:'block',marginBottom:5 }}>Cierre</label>
                <input type="time" value={horario.hora_cierre} onChange={e=>setHorario(p=>({...p,hora_cierre:e.target.value}))} style={inp} />
              </div>
            </div>
            <button onClick={async()=>{ await updateRestaurante(horario); await refreshSession(); alert('Horario guardado ✓') }} style={{ width:'100%',padding:12,borderRadius:12,border:'none',background:'#e91e63',color:'#fff',fontWeight:800,cursor:'pointer' }}>Guardar Horario</button>
          </div>

          {/* Notificaciones */}
          <div style={{ background:'#fff',borderRadius:12,padding:24,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',border:'1px solid #e5e7eb',marginBottom:20 }}>
            <h4 style={{ margin:'0 0 6px',fontWeight:800,color:'#374151' }}>Notificaciones</h4>
            <p style={{ fontSize:13,color:'#64748b',margin:'0 0 16px' }}>Configura las alertas de nuevos pedidos.</p>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontWeight:700,fontSize:14,color:'#374151' }}>Sonido de notificación</div>
                <div style={{ fontSize:12,color:'#6b7280' }}>Reproduce un sonido al recibir un nuevo pedido</div>
              </div>
              <button onClick={()=>{ const next=!soundEnabled; setSoundEnabled(next); localStorage.setItem('notif_sound',next?'on':'off') }} style={{ width:48,height:26,borderRadius:13,border:'none',cursor:'pointer',background:soundEnabled?'#e91e63':'#d1d5db',position:'relative',transition:'background 0.2s' }}>
                <div style={{ width:20,height:20,borderRadius:10,background:'#fff',position:'absolute',top:3,left:soundEnabled?25:3,transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0' }}>
              <div>
                <div style={{ fontWeight:700,fontSize:14,color:'#374151' }}>Notificaciones del navegador</div>
                <div style={{ fontSize:12,color:'#6b7280' }}>{notifEnabled?'Activadas':'Desactivadas — haz clic para activar'}</div>
              </div>
              <button onClick={()=>requestNotificationPermission().then(g=>setNotifEnabled(g))} style={{ padding:'6px 14px',borderRadius:8,border:'1px solid #d1d5db',background:notifEnabled?'#dcfce7':'#fff',color:notifEnabled?'#166534':'#374151',fontWeight:600,fontSize:12,cursor:'pointer' }}>
                {notifEnabled?'Activado':'Activar'}
              </button>
            </div>
          </div>

          {/* Link público */}
          <div style={{ background:'#fff',borderRadius:12,padding:24,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',border:'1px solid #e5e7eb' }}>
            <h4 style={{ margin:'0 0 8px',fontWeight:800,color:'#374151' }}>Tu Link Público</h4>
            <p style={{ fontSize:13,color:'#64748b',margin:'0 0 12px' }}>Comparte este link con tus clientes:</p>
            <div style={{ display:'flex',gap:10 }}>
              <input readOnly value={window.location.origin + '/menu/' + slug} style={{ ...inp,background:'#f8fafc',color:'#374151',fontWeight:700 }}/>
              <button onClick={()=>navigator.clipboard.writeText(window.location.origin + '/menu/' + slug)} style={{ padding:'8px 14px',borderRadius:10,border:'none',background:'#1e293b',color:'#fff',fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',fontSize:12 }}>Copiar</button>
            </div>
          </div>
        </div>)}

      {/* Edit Modal */}
      {editItem && (<div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
        <div style={{ background:'#fff',borderRadius:12,padding:26,maxWidth:400,width:'100%' }}>
          <h3 style={{ margin:'0 0 18px',fontWeight:800,color:'#1e293b' }}>Editar plato</h3>
          {[{l:'Nombre',k:'nombre',t:'text'},{l:'Descripción',k:'descripcion',t:'text'},{l:'Precio (Bs)',k:'precio',t:'number'},{l:'Stock',k:'stock',t:'number'},{l:'Stock inicial',k:'stock_inicial',t:'number'},{l:'Emoji',k:'emoji',t:'text'}].map(({l,k,t})=>(<div key={k} style={{ marginBottom:12 }}><label style={{ fontSize:13,fontWeight:700,display:'block',marginBottom:5,color:'#374151' }}>{l}</label><input type={t} value={(editForm as any)[k]||''} onChange={e=>setEditForm(p=>({...p,[k]:t==='number'?parseFloat(e.target.value):e.target.value}))} style={inp}/></div>))}
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:13,fontWeight:700,display:'block',marginBottom:5,color:'#374151' }}>Foto del plato</label>
            {(editForm as any).imagen_url && <img src={(editForm as any).imagen_url} alt="" style={{ width:80,height:80,borderRadius:8,objectFit:'cover',marginBottom:8 }} />}
            <input type="file" accept="image/*" onChange={async(e)=>{
              const file=e.target.files?.[0]; if(!file||!rest?.id) return
              if(file.size>2*1024*1024){alert('Máximo 2 MB');return}
              const ext=file.name.split('.').pop()
              const path=`${rest.id}/platos/${editItem.id}.${ext}`
              const {error:upErr}=await supabase.storage.from('plato-imagenes').upload(path,file,{upsert:true,contentType:file.type})
              if(upErr){alert('Error: '+upErr.message);return}
              const {data:{publicUrl}}=supabase.storage.from('plato-imagenes').getPublicUrl(path)
              const imagen_url=`${publicUrl}?t=${Date.now()}`
              setEditForm(p=>({...p,imagen_url}))
            }} style={{ fontSize:12 }} />
          </div>
          <div style={{ display:'flex',gap:10 }}>
            <button onClick={async()=>{ await updatePlato(editItem.id,editForm); setPlatos(prev=>prev.map(p=>p.id===editItem.id?{...p,...editForm}:p)); setEditItem(null) }} style={{ flex:1,padding:11,borderRadius:12,border:'none',background:'#e91e63',color:'#fff',fontWeight:800,cursor:'pointer' }}>Guardar</button>
            <button onClick={()=>setEditItem(null)} style={{ flex:1,padding:11,borderRadius:12,border:'none',background:'#f1f5f9',color:'#64748b',fontWeight:700,cursor:'pointer' }}>Cancelar</button>
          </div>
        </div>
      </div>)}

      {/* New Plato Modal */}
      {showNew && (<div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
        <div style={{ background:'#fff',borderRadius:12,padding:26,maxWidth:400,width:'100%' }}>
          <h3 style={{ margin:'0 0 18px',fontWeight:800,color:'#1e293b' }}>Nuevo plato — {editDay}</h3>
          {[{l:'Categoría',k:'categoria',t:'select'},{l:'Nombre',k:'nombre',t:'text'},{l:'Descripción',k:'descripcion',t:'text'},{l:'Precio (Bs)',k:'precio',t:'number'},{l:'Stock',k:'stock',t:'number'},{l:'Stock inicial',k:'stock_inicial',t:'number'},{l:'Emoji',k:'emoji',t:'text'}].map(({l,k,t})=>(<div key={k} style={{ marginBottom:12 }}><label style={{ fontSize:13,fontWeight:700,display:'block',marginBottom:5,color:'#374151' }}>{l}</label>
            {t==='select'?(<select value={(newForm as any)[k]||''} onChange={e=>setNewForm(p=>({...p,[k]:e.target.value}))} style={inp}><option value="sopa">Sopa</option><option value="segundo">Segundo</option><option value="extra">Extra</option></select>)
            :(<input type={t} value={(newForm as any)[k]||''} onChange={e=>setNewForm(p=>({...p,[k]:t==='number'?parseFloat(e.target.value):e.target.value}))} style={inp}/>)}
          </div>))}
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:13,fontWeight:700,display:'block',marginBottom:5,color:'#374151' }}>Foto del plato</label>
            {(newForm as any).imagen_url && <img src={(newForm as any).imagen_url} alt="" style={{ width:80,height:80,borderRadius:8,objectFit:'cover',marginBottom:8 }} />}
            <input type="file" accept="image/*" onChange={async(e)=>{
              const file=e.target.files?.[0]; if(!file||!rest?.id) return
              if(file.size>2*1024*1024){alert('Máximo 2 MB');return}
              const ext=file.name.split('.').pop()
              const tmpId=Date.now()
              const path=`${rest.id}/platos/tmp_${tmpId}.${ext}`
              const {error:upErr}=await supabase.storage.from('plato-imagenes').upload(path,file,{upsert:true,contentType:file.type})
              if(upErr){alert('Error: '+upErr.message);return}
              const {data:{publicUrl}}=supabase.storage.from('plato-imagenes').getPublicUrl(path)
              const imagen_url=`${publicUrl}?t=${Date.now()}`
              setNewForm(p=>({...p,imagen_url}))
            }} style={{ fontSize:12 }} />
          </div>
          <div style={{ display:'flex',gap:10 }}>
            <button onClick={async()=>{ const dia=dias.find(d=>d.nombre===editDay); if(!dia)return; const created=await createPlato({...newForm,dia_id:dia.id} as any); setPlatos(prev=>[...prev,created]); setShowNew(false) }} style={{ flex:1,padding:11,borderRadius:12,border:'none',background:'#e91e63',color:'#fff',fontWeight:800,cursor:'pointer' }}>Crear</button>
            <button onClick={()=>setShowNew(false)} style={{ flex:1,padding:11,borderRadius:12,border:'none',background:'#f1f5f9',color:'#64748b',fontWeight:700,cursor:'pointer' }}>Cancelar</button>
          </div>
        </div>
      </div>)}

      {/* Import CSV */}
      <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display:'none' }} onChange={async e=>{
        const f=e.target.files?.[0]; if(!f) return
        const text=await f.text()
        const lines=text.trim().split('\n').map(l=>l.split(',').map(c=>c.trim().replace(/"/g,'')))
        const h=lines[0].map(x=>x.toLowerCase()); const gi=(k:string)=>h.indexOf(k)
        for(let i=1;i<lines.length;i++){
          const r=lines[i]; const diaNombre=r[gi('dia')]; const cat=r[gi('categoria')]
          const dia=dias.find(d=>d.nombre===diaNombre); if(!dia) continue
          await createPlato({dia_id:dia.id,categoria:cat,nombre:r[gi('nombre')],descripcion:r[gi('descripcion')]||'',precio:parseFloat(r[gi('precio')]),emoji:r[gi('emoji')]||'🍽️',stock:parseInt(r[gi('stock')]),stock_inicial:parseInt(r[gi('stock')])} as any)
        }
        alert('Importación completada'); loadAll()
      }}/>

        </div>
        </div>
      </div>
    </div>
  )
}
