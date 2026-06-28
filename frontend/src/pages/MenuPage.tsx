import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { getMenuBySlug, getDiasBySlug, createPedido } from '@/lib/api'
import { fmtCur, genId } from '@/lib/utils'
import type { MenuDia, Dia, Combo, PedidoItem, Consumo, MetodoPago } from '@/types'

function StockBadge({ stock, init }: { stock: number; init: number }) {
  const pct = init > 0 ? (stock / init) * 100 : 0
  const col = pct > 50 ? '#22c55e' : pct > 20 ? '#eab308' : '#ef4444'
  return (
    <span style={{ fontSize:12, fontWeight:600, color: stock === 0 ? '#ef4444' : col }}>
      {stock === 0 ? 'Agotado' : `${stock} disp.`}
    </span>
  )
}

export default function MenuPage() {
  const { slug } = useParams<{ slug: string }>()
  const [menu, setMenu] = useState<MenuDia[]>([])
  const [dias, setDias] = useState<Dia[]>([])
  const [restaurante, setRestaurante] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeDay, setActiveDay] = useState('')
  const [menuType, setMenuType] = useState<'completo'|'sopa'|'segundo'|'extra'>('completo')
  const [cart, setCart] = useState<Record<string,any>>({})
  const [combos, setCombos] = useState<Combo[]>([])
  const [consumo, setConsumo] = useState<Consumo>('local')
  const [step, setStep] = useState<'menu'|'datos'|'pago'|'done'>('menu')
  const [customer, setCustomer] = useState({ nombre:'', apellido:'', whatsapp:'', hora:'' })
  const [custErr, setCustErr] = useState<Record<string,string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [payMethod, setPayMethod] = useState<MetodoPago>('efectivo')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [search, setSearch] = useState('')
  const [finalTotal, setFinalTotal] = useState(0)
  const [showMobileCart, setShowMobileCart] = useState(false)
  const cartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => {
    if (!slug) return
    Promise.all([getMenuBySlug(slug), getDiasBySlug(slug)]).then(([m, d]) => {
      setMenu(m.menu ?? m); setDias(d); setRestaurante(m.restaurante ?? null)
      const first = (d as Dia[]).find(x=>x.habilitado)?.nombre ?? ''
      setActiveDay(first)
    }).catch(console.error).finally(()=>setLoading(false))
  }, [slug])

  const activeDays = dias.filter(d=>d.habilitado)
  const disabledDaysWithMsg = dias.filter(d=>!d.habilitado && d.mensaje_deshabilitado)

  function isOutsideHours() {
    if (!restaurante?.hora_apertura || !restaurante?.hora_cierre) return false
    const now = new Date()
    const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
    return hhmm < restaurante.hora_apertura || hhmm > restaurante.hora_cierre
  }
  const outsideHours = isOutsideHours()
  const dayMenuData = menu.find(m=>m.dia.nombre===activeDay)
  const today = (['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'] as const)[new Date().getDay()]

  const cartKeys = Object.keys(cart)
  const simpleItems = cartKeys.filter(k=>!k.endsWith('-completo')).map(k=>cart[k])
  const comboValid = combos.length>0 && combos.every(c=>c.sopaIdx!==null&&c.segundoIdx!==null)
  const hasItems = simpleItems.length>0 || comboValid
  const totalQty = simpleItems.reduce((s,c)=>s+c.qty,0) + (comboValid ? combos.reduce((s,c)=>s+c.qty,0) : 0)

  function simpleTotal() {
    return cartKeys.filter(k=>!k.endsWith('-completo')).reduce((sum,k)=>{
      const ci=cart[k]; if(!dayMenuData) return sum
      if(ci.type==='extra') return sum+(dayMenuData.extra?.precio??0)*ci.qty
      const arr=ci.type==='sopa'?dayMenuData.sopas:dayMenuData.segundos
      return sum+(arr[ci.idx]?.precio??0)*ci.qty
    },0)
  }
  function comboTotal() {
    if(!dayMenuData) return 0
    return combos.reduce((sum,c)=>{
      const s=c.sopaIdx!==null?dayMenuData.sopas[c.sopaIdx!]:null
      const g=c.segundoIdx!==null?dayMenuData.segundos[c.segundoIdx!]:null
      return s&&g?sum+(s.precio+g.precio)*c.qty:sum
    },0)
  }
  const cartTotal = simpleTotal() + comboTotal()

  function addToCart(type: 'sopa'|'segundo'|'extra', idx: number) {
    const key=`${activeDay}-${type}-${idx}`
    setCart(prev=>{
      const n={...prev}
      if(n[key]) { n[key]={...n[key], qty: n[key].qty+1}; return n }
      n[key]={type,idx,qty:1,day:activeDay}; return n
    })
  }
  function removeFromCart(key: string) {
    setCart(prev=>{ const n={...prev}; delete n[key]; return n })
  }
  function setQty(key: string, qty: number) {
    if(qty<1) { removeFromCart(key); return }
    setCart(prev=>({...prev,[key]:{...prev[key],qty}}))
  }

  // Combo helpers
  const addCombo = () => setCombos(prev=>[...prev, { sopaIdx:null, segundoIdx:null, qty:1 }])
  const removeCombo = (i: number) => setCombos(prev=>prev.filter((_,idx)=>idx!==i))
  const pickSopa = (ci: number, si: number) => {
    const upd = combos.map((c,i)=>i===ci?{...c,sopaIdx:c.sopaIdx===si?null:si}:c)
    const cur = upd[ci]
    if (cur.sopaIdx!==null && cur.segundoIdx!==null) {
      const dup = upd.findIndex((c,i)=>i!==ci&&c.sopaIdx===cur.sopaIdx&&c.segundoIdx===cur.segundoIdx)
      if (dup>=0) { setCombos(upd.map((c,i)=>i===dup?{...c,qty:c.qty+cur.qty}:c).filter((_,i)=>i!==ci)); return }
    }
    setCombos(upd)
  }
  const pickSeg = (ci: number, gi: number) => {
    const upd = combos.map((c,i)=>i===ci?{...c,segundoIdx:c.segundoIdx===gi?null:gi}:c)
    const cur = upd[ci]
    if (cur.sopaIdx!==null && cur.segundoIdx!==null) {
      const dup = upd.findIndex((c,i)=>i!==ci&&c.sopaIdx===cur.sopaIdx&&c.segundoIdx===cur.segundoIdx)
      if (dup>=0) { setCombos(upd.map((c,i)=>i===dup?{...c,qty:c.qty+cur.qty}:c).filter((_,i)=>i!==ci)); return }
    }
    setCombos(upd)
  }
  const setComboQty = (i: number, qty: number) => {
    if(qty<1) { removeCombo(i); return }
    setCombos(prev=>prev.map((c,idx)=>idx===i?{...c,qty}:c))
  }

  function buildItems(): PedidoItem[] {
    const out: PedidoItem[] = []
    if(comboValid && dayMenuData) {
      combos.forEach((c,idx)=>{
        const s=dayMenuData.sopas[c.sopaIdx!]; const g=dayMenuData.segundos[c.segundoIdx!]
        out.push({plato_id:s.id,nombre:s.nombre,precio:s.precio,cantidad:c.qty,tipo_linea:'sopa',combo_num:idx+1,comboNum:idx+1})
        out.push({plato_id:g.id,nombre:g.nombre,precio:g.precio,cantidad:c.qty,tipo_linea:'segundo',combo_num:idx+1,comboNum:idx+1})
      })
    }
    cartKeys.filter(k=>!k.endsWith('-completo')).forEach(k=>{
      const ci=cart[k]; if(!dayMenuData) return
      if(ci.type==='extra'&&dayMenuData.extra) out.push({plato_id:dayMenuData.extra.id,nombre:dayMenuData.extra.nombre,precio:dayMenuData.extra.precio,cantidad:ci.qty,tipo_linea:'extra'})
      else { const arr=ci.type==='sopa'?dayMenuData.sopas:dayMenuData.segundos; const item=arr[ci.idx]; if(item) out.push({plato_id:item.id,nombre:item.nombre,precio:item.precio,cantidad:ci.qty,tipo_linea:ci.type}) }
    })
    return out
  }

  function validateCustomer() {
    const e: Record<string,string>={}
    if(!customer.nombre.trim()) e.nombre='Ingresa tu nombre'
    if(!customer.apellido.trim()) e.apellido='Ingresa tu apellido'
    if(!/^\d{7,10}$/.test(customer.whatsapp.trim())) e.whatsapp='Número válido (7-10 dígitos)'
    if(!customer.hora) e.hora='Selecciona una hora'
    return e
  }

  function handleConfirmData() {
    const e=validateCustomer(); if(Object.keys(e).length>0){setCustErr(e);return}
    setStep('pago')
  }

  async function handlePay(method: MetodoPago) {
    setPayMethod(method); setSubmitting(true)
    const id=genId()
    const total=cartTotal
    try {
      await createPedido({
        codigo:id, nombre:customer.nombre, apellido:customer.apellido,
        whatsapp:customer.whatsapp, hora_recojo:customer.hora,
        consumo, metodo_pago:method, total,
        dia_nombre:activeDay, items:buildItems()
      }, slug!)
      setFinalTotal(total)
      setOrderId(id); setStep('done')
      setCart({}); setCombos([])
    } catch(e){ alert('Error al registrar. Intenta de nuevo.'); console.error(e) }
    finally { setSubmitting(false) }
  }

  // ── Styles ──
  const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  const inp: React.CSSProperties={ width:'100%', padding:'12px 14px', borderRadius:8, border:'1px solid #d1d5db', fontSize:14, boxSizing:'border-box', outline:'none', fontFamily:font }

  if(loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', gap:16, fontFamily:font }}>
      <div style={{ width:40, height:40, border:'3px solid #e5e7eb', borderTopColor:'#e91e63', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <p style={{ fontSize:15, color:'#6b7280', fontWeight:500 }}>Cargando menú...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    </div>
  )
  if(!menu.length) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', gap:8, padding:20, textAlign:'center', fontFamily:font }}>
      <p style={{ fontSize:18, color:'#374151', fontWeight:600 }}>Restaurante no encontrado</p>
      <p style={{ fontSize:14, color:'#6b7280' }}>Verifica que el link sea correcto</p>
    </div>
  )

  function renderProductCard(item: any, type: 'sopa'|'segundo'|'extra', idx: number) {
    const key=`${activeDay}-${type}-${idx}`
    const inCart=cart[key]
    const qty=inCart?.qty??0
    const outOfStock=item.stock===0
    const matchesSearch = !search || item.nombre.toLowerCase().includes(search.toLowerCase())
    if(!matchesSearch) return null

    return (
      <div key={key} style={{
        display:'flex', justifyContent:'space-between', alignItems:'center',
        padding: isMobile ? '14px 12px' : '16px 20px',
        borderBottom:'1px solid #f3f4f6',
        opacity:outOfStock?0.5:1,
        background: qty > 0 ? '#fef9f5' : '#fff',
        cursor: outOfStock ? 'default' : 'pointer',
        transition:'background 0.15s',
      }}
      onClick={()=>!outOfStock && addToCart(type, idx)}
      >
        <div style={{ flex:1, minWidth:0, marginRight:16 }}>
          {item.popular && <span style={{ fontSize:11, fontWeight:700, color:'#d97706', background:'#fef3c7', padding:'2px 8px', borderRadius:4, marginBottom:4, display:'inline-block' }}>Más vendido</span>}
          <div style={{ fontSize:15, fontWeight:600, color:'#1f2937', marginBottom:2 }}>{item.nombre}</div>
          {item.descripcion && <div style={{ fontSize:13, color:'#6b7280', marginBottom:4, lineHeight:1.4 }}>{item.descripcion}</div>}
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:15, fontWeight:700, color:'#1f2937' }}>{fmtCur(item.precio)}</span>
            <StockBadge stock={item.stock} init={item.stock_inicial} />
          </div>
        </div>
        <div style={{ position:'relative', flexShrink:0 }}>
          {item.imagen_url ? (
            <img src={item.imagen_url} alt="" style={{ width: isMobile ? 80 : 100, height: isMobile ? 80 : 100, borderRadius:8, objectFit:'cover' }} />
          ) : (
            <div style={{ width: isMobile ? 80 : 100, height: isMobile ? 80 : 100, borderRadius:8, background:'#f9fafb', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, border:'1px solid #f3f4f6' }}>
              {item.emoji || (type==='sopa'?'🥣':type==='segundo'?'🍛':'🥤')}
            </div>
          )}
          {qty > 0 && (
            <div style={{ position:'absolute', bottom:-6, right:-6, display:'flex', alignItems:'center', background:'#fff', borderRadius:20, boxShadow:'0 2px 8px rgba(0,0,0,0.15)', border:'1px solid #e5e7eb', overflow:'hidden' }}
              onClick={e=>e.stopPropagation()}>
              <button onClick={()=>setQty(key, qty-1)} style={{ width:28, height:28, border:'none', background:'#fff', color:'#e91e63', fontWeight:700, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
              <span style={{ fontSize:13, fontWeight:700, color:'#1f2937', minWidth:20, textAlign:'center' }}>{qty}</span>
              <button onClick={()=>setQty(key, Math.min(item.stock, qty+1))} style={{ width:28, height:28, border:'none', background:'#e91e63', color:'#fff', fontWeight:700, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'0 20px 20px 0' }}>+</button>
            </div>
          )}
          {!qty && !outOfStock && (
            <div style={{ position:'absolute', bottom:-6, right:-6, width:28, height:28, borderRadius:'50%', background:'#e91e63', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, boxShadow:'0 2px 6px rgba(233,30,99,0.4)', cursor:'pointer' }}
              onClick={e=>{e.stopPropagation(); addToCart(type, idx)}}>+</div>
          )}
        </div>
      </div>
    )
  }

  function renderComboSection() {
    if(!dayMenuData) return null
    const { sopas, segundos } = dayMenuData
    return (
      <div>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #f3f4f6' }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#1f2937', marginBottom:4 }}>Arma tu almuerzo completo</div>
          <div style={{ fontSize:13, color:'#6b7280' }}>Elige 1 sopa + 1 segundo por combinación</div>
        </div>

        {combos.map((combo, ci) => {
          const sopaObj = combo.sopaIdx!==null ? sopas[combo.sopaIdx!] : null
          const segObj  = combo.segundoIdx!==null ? segundos[combo.segundoIdx!] : null
          const done = !!sopaObj && !!segObj
          return (
            <div key={ci} style={{ margin:'12px 16px', border:'1px solid #e5e7eb', borderRadius:12, overflow:'hidden', background:'#fff' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background: done ? '#fef9f5' : '#f9fafb', borderBottom:'1px solid #f3f4f6' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', background: done ? '#e91e63':'#d1d5db', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12 }}>{ci+1}</div>
                  <span style={{ fontWeight:600, fontSize:13, color:'#374151' }}>
                    {done ? `${sopaObj!.nombre} + ${segObj!.nombre}` : `Combinación ${ci+1}`}
                  </span>
                  {done && <span style={{ fontSize:11, background:'#dcfce7', color:'#166534', borderRadius:4, padding:'1px 6px', fontWeight:600 }}>Listo</span>}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  {done && (<>
                    <button onClick={()=>setComboQty(ci, combo.qty-1)} style={{ width:26, height:26, borderRadius:6, border:'1px solid #d1d5db', background:'#fff', cursor:'pointer', fontSize:14, fontWeight:700, color:'#374151', display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                    <span style={{ fontSize:13, fontWeight:700, minWidth:18, textAlign:'center' }}>{combo.qty}</span>
                    <button onClick={()=>setComboQty(ci, combo.qty+1)} style={{ width:26, height:26, borderRadius:6, border:'none', background:'#e91e63', color:'#fff', cursor:'pointer', fontSize:14, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                    <span style={{ fontSize:13, fontWeight:700, color:'#e91e63', marginLeft:4 }}>{fmtCur((sopaObj!.precio+segObj!.precio)*combo.qty)}</span>
                  </>)}
                  <button onClick={()=>removeCombo(ci)} style={{ border:'none', background:'none', color:'#9ca3af', cursor:'pointer', fontSize:18, padding:'0 4px' }}>×</button>
                </div>
              </div>
              {!done && (
                <div style={{ padding:12, display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:10 }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:'#6b7280', textTransform:'uppercase', marginBottom:6 }}>Elige tu sopa</div>
                    {sopas.map((s: any, si: number) => {
                      const sel = combo.sopaIdx === si
                      return (
                        <button key={si} onClick={()=>pickSopa(ci, si)} style={{ width:'100%', marginBottom:4, padding:'8px 10px', borderRadius:6, border:`1px solid ${sel?'#e91e63':'#e5e7eb'}`, background:sel?'#fef1f5':'#fff', color: s.stock<=0?'#9ca3af':'#374151', fontWeight:sel?600:400, fontSize:13, cursor:s.stock<=0?'not-allowed':'pointer', textAlign:'left', display:'flex', justifyContent:'space-between', opacity:s.stock<=0?0.5:1 }}>
                          <span>{s.nombre}</span>
                          <span style={{ fontSize:12, color:sel?'#e91e63':'#6b7280' }}>{fmtCur(s.precio)}</span>
                        </button>
                      )
                    })}
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:'#6b7280', textTransform:'uppercase', marginBottom:6 }}>Elige tu segundo</div>
                    {segundos.map((s: any, gi: number) => {
                      const sel = combo.segundoIdx === gi
                      return (
                        <button key={gi} onClick={()=>pickSeg(ci, gi)} style={{ width:'100%', marginBottom:4, padding:'8px 10px', borderRadius:6, border:`1px solid ${sel?'#e91e63':'#e5e7eb'}`, background:sel?'#fef1f5':'#fff', color: s.stock<=0?'#9ca3af':'#374151', fontWeight:sel?600:400, fontSize:13, cursor:s.stock<=0?'not-allowed':'pointer', textAlign:'left', display:'flex', justifyContent:'space-between', opacity:s.stock<=0?0.5:1 }}>
                          <span>{s.nombre}</span>
                          <span style={{ fontSize:12, color:sel?'#e91e63':'#6b7280' }}>{fmtCur(s.precio)}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              {done && (
                <div style={{ padding:'8px 14px', borderTop:'1px solid #f3f4f6' }}>
                  <button onClick={()=>setCombos(prev=>prev.map((c,i)=>i===ci?{...c,sopaIdx:null,segundoIdx:null}:c))} style={{ border:'none', background:'none', color:'#e91e63', cursor:'pointer', fontWeight:500, fontSize:12, padding:0 }}>Cambiar selección</button>
                </div>
              )}
            </div>
          )
        })}

        <div style={{ padding:'12px 16px' }}>
          <button onClick={addCombo} style={{ width:'100%', padding:'10px 0', borderRadius:8, border:'1px dashed #d1d5db', background:'#fff', color:'#e91e63', fontWeight:600, fontSize:14, cursor:'pointer' }}>+ Agregar almuerzo</button>
        </div>
      </div>
    )
  }

  function renderCart() {
    return (
      <div ref={cartRef} style={{ background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', overflow:'hidden', ...(isMobile ? {} : { position:'sticky', top:80 }) }}>
        <div style={{ padding:'16px 18px', borderBottom:'1px solid #f3f4f6' }}>
          <div style={{ fontSize:16, fontWeight:700, color:'#1f2937' }}>Mi pedido</div>
        </div>
        {!hasItems ? (
          <div style={{ padding:'40px 20px', textAlign:'center' }}>
            <div style={{ width:60, height:60, margin:'0 auto 12px', background:'#f3f4f6', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            </div>
            <p style={{ fontSize:14, fontWeight:500, color:'#6b7280', margin:0 }}>Tu pedido está vacío</p>
          </div>
        ) : (
          <>
            <div style={{ padding:'0 18px' }}>
              {comboValid && dayMenuData && combos.map((c,i)=>{
                const s=dayMenuData.sopas[c.sopaIdx!]; const g=dayMenuData.segundos[c.segundoIdx!]
                return (
                  <div key={`combo-${i}`} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #f3f4f6' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#1f2937' }}>{c.qty}x Almuerzo #{i+1}</div>
                      <div style={{ fontSize:12, color:'#6b7280' }}>{s.nombre} + {g.nombre}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:13, fontWeight:600 }}>{fmtCur((s.precio+g.precio)*c.qty)}</span>
                      <button onClick={()=>removeCombo(i)} style={{ border:'none', background:'none', color:'#9ca3af', cursor:'pointer', fontSize:16 }}>×</button>
                    </div>
                  </div>
                )
              })}
              {simpleItems.map((ci,i)=>{
                if(!dayMenuData) return null
                const item=ci.type==='extra'?dayMenuData.extra:(ci.type==='sopa'?dayMenuData.sopas:dayMenuData.segundos)[ci.idx]
                if(!item) return null
                const key = `${ci.day}-${ci.type}-${ci.idx}`
                return (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #f3f4f6' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#1f2937' }}>{ci.qty}x {(item as any).nombre}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:13, fontWeight:600 }}>{fmtCur((item as any).precio*ci.qty)}</span>
                      <button onClick={()=>removeFromCart(key)} style={{ border:'none', background:'none', color:'#9ca3af', cursor:'pointer', fontSize:16 }}>×</button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ padding:'12px 18px', borderTop:'1px solid #e5e7eb' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <span style={{ fontSize:15, fontWeight:700, color:'#1f2937' }}>Total</span>
                <span style={{ fontSize:17, fontWeight:700, color:'#1f2937' }}>{fmtCur(cartTotal)}</span>
              </div>
              <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                {(['local','llevar'] as const).map(v=>(
                  <button key={v} onClick={()=>setConsumo(v)} style={{ flex:1, padding:'8px', borderRadius:6, cursor:'pointer', border:`1px solid ${consumo===v?'#e91e63':'#d1d5db'}`, background:consumo===v?'#fef1f5':'#fff', color:consumo===v?'#e91e63':'#6b7280', fontWeight:600, fontSize:12 }}>
                    {v==='local'?'En el local':'Para llevar'}
                  </button>
                ))}
              </div>
              {outsideHours ? (
                <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#991b1b', textAlign:'center', fontWeight:600 }}>
                  Fuera de horario de atención ({restaurante.hora_apertura} - {restaurante.hora_cierre})
                </div>
              ) : (
                <button onClick={()=>setStep('datos')} style={{ width:'100%', padding:'12px 0', borderRadius:8, border:'none', background:'#e91e63', color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer' }}>
                  Confirmar pedido
                </button>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  const allItems: {item:any, type:'sopa'|'segundo'|'extra', idx:number}[] = []
  if(dayMenuData) {
    dayMenuData.sopas.forEach((s,i)=>allItems.push({item:s,type:'sopa',idx:i}))
    dayMenuData.segundos.forEach((s,i)=>allItems.push({item:s,type:'segundo',idx:i}))
    if(dayMenuData.extra) allItems.push({item:dayMenuData.extra,type:'extra',idx:0})
  }

  const categories: {key:string, label:string, type:'completo'|'sopa'|'segundo'|'extra'}[] = [
    { key:'completo', label:'Almuerzo Completo', type:'completo' },
    { key:'sopa', label:'Sopas', type:'sopa' },
    { key:'segundo', label:'Segundos', type:'segundo' },
    { key:'extra', label:'Extras', type:'extra' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#fafafa', fontFamily:font }}>
      <style>{`.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
      {/* Header */}
      <header style={{ background:'#fff', borderBottom:'1px solid #e5e7eb', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding: isMobile ? '12px 16px' : '12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {restaurante?.logo_url
              ? <img src={restaurante.logo_url} alt="" style={{ width:40, height:40, borderRadius:8, objectFit:'cover' }} />
              : <div style={{ width:40, height:40, borderRadius:8, background:'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🍽️</div>}
            <div>
              <div style={{ fontWeight:700, fontSize:16, color:'#1f2937' }}>{restaurante?.nombre ?? 'Menú'}</div>
              {restaurante?.ciudad && <div style={{ fontSize:12, color:'#6b7280' }}>{restaurante.ciudad}{restaurante?.direccion ? ` · ${restaurante.direccion}` : ''}</div>}
            </div>
          </div>
        </div>
      </header>

      {/* Restaurant Info */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e5e7eb' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding: isMobile ? '16px' : '20px 24px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:16 }}>
            {restaurante?.logo_url
              ? <img src={restaurante.logo_url} alt="" style={{ width: isMobile ? 60 : 80, height: isMobile ? 60 : 80, borderRadius:12, objectFit:'cover', border:'1px solid #e5e7eb' }} />
              : <div style={{ width: isMobile ? 60 : 80, height: isMobile ? 60 : 80, borderRadius:12, background:'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>🍽️</div>}
            <div>
              <h1 style={{ margin:'0 0 4px', fontSize: isMobile ? 18 : 22, fontWeight:700, color:'#1f2937' }}>{restaurante?.nombre}</h1>
              {restaurante?.descripcion && <p style={{ margin:'0 0 4px', fontSize:13, color:'#6b7280', lineHeight:1.4 }}>{restaurante.descripcion}</p>}
              {restaurante?.telefono && <div style={{ fontSize:13, color:'#6b7280' }}>Tel: {restaurante.telefono}</div>}
            </div>
          </div>

          {/* Search */}
          <div style={{ position:'relative', marginBottom:12 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar productos..." style={{ ...inp, paddingLeft:38, background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:24 }} />
          </div>

          {/* Outside hours notice */}
          {outsideHours && (
            <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, padding:'12px 16px', marginBottom:12, fontSize:13, color:'#92400e', fontWeight:600, textAlign:'center' }}>
              Estamos fuera de horario de atención. Horario: {restaurante.hora_apertura} - {restaurante.hora_cierre}
            </div>
          )}

          {/* Disabled day notices */}
          {disabledDaysWithMsg.length>0 && disabledDaysWithMsg.map(d=>(
            <div key={d.id} style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'12px 16px', marginBottom:12, display:'flex', gap:10, alignItems:'flex-start' }}>
              <span style={{ color:'#dc2626', fontSize:18, lineHeight:1, flexShrink:0, marginTop:1 }}>!</span>
              <div>
                <span style={{ fontWeight:700, fontSize:13, color:'#991b1b' }}>{d.nombre}</span>
                <p style={{ margin:'4px 0 0', fontSize:13, color:'#7f1d1d', lineHeight:1.5 }}>{d.mensaje_deshabilitado}</p>
              </div>
            </div>
          ))}

          {/* Day tabs */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, paddingBottom:10 }}>
            {activeDays.map(d=>(
              <button key={d.id} onClick={()=>{setActiveDay(d.nombre);setCart({});setCombos([]);setSearch('')}} style={{
                padding:'8px 14px', borderRadius:20, cursor:'pointer', fontWeight:600, fontSize:13,
                border: activeDay===d.nombre ? '2px solid #e91e63' : '1px solid #d1d5db',
                background: activeDay===d.nombre ? '#fef1f5' : '#fff',
                color: activeDay===d.nombre ? '#e91e63' : '#374151',
              }}>
                {d.nombre===today ? `${d.nombre} (Hoy)` : d.nombre}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e5e7eb', position:'sticky', top:65, zIndex:90 }}>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', flexWrap:'wrap', gap:0 }}>
          {categories.map(cat=>(
            <button key={cat.key} onClick={()=>{setMenuType(cat.type);setSearch('')}} style={{
              padding: isMobile ? '10px 14px' : '12px 20px', cursor:'pointer', fontWeight:600, fontSize:13,
              border:'none', borderBottom: menuType===cat.type ? '3px solid #e91e63' : '3px solid transparent',
              background:'transparent', color: menuType===cat.type ? '#e91e63' : '#6b7280',
              whiteSpace:'nowrap', flexShrink:0,
            }}>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth:1200, margin:'0 auto', padding: isMobile ? '0' : '20px 24px' }}>
        <div style={{ display: isMobile ? 'block' : 'flex', gap:24, alignItems:'flex-start' }}>
          {/* Products */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ background:'#fff', borderRadius: isMobile ? 0 : 12, border: isMobile ? 'none' : '1px solid #e5e7eb', overflow:'hidden' }}>
              {/* Section title */}
              <div style={{ padding:'14px 20px', borderBottom:'1px solid #f3f4f6' }}>
                <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:'#1f2937', textTransform:'uppercase', letterSpacing:0.5 }}>
                  {categories.find(c=>c.type===menuType)?.label}
                </h2>
              </div>

              {menuType === 'completo' ? renderComboSection() : (
                <div>
                  {menuType === 'extra' && dayMenuData?.extra ? (
                    renderProductCard(dayMenuData.extra, 'extra', 0)
                  ) : (
                    (menuType==='sopa' ? dayMenuData?.sopas : dayMenuData?.segundos)?.map((item, idx) =>
                      renderProductCard(item, menuType, idx)
                    )
                  )}
                  {menuType !== 'extra' && (menuType==='sopa' ? dayMenuData?.sopas : dayMenuData?.segundos)?.length === 0 && (
                    <div style={{ padding:'40px 20px', textAlign:'center', color:'#6b7280', fontSize:14 }}>No hay productos disponibles para este día</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cart sidebar - desktop */}
          {!isMobile && (
            <div style={{ width:320, flexShrink:0 }}>
              {renderCart()}
            </div>
          )}
        </div>
      </div>

      {/* Mobile cart bar */}
      {isMobile && hasItems && step==='menu' && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100, padding:'12px 16px', background:'#fff', borderTop:'1px solid #e5e7eb', boxShadow:'0 -4px 12px rgba(0,0,0,0.08)' }}>
          <button onClick={()=>setShowMobileCart(true)} style={{ width:'100%', padding:'14px 20px', borderRadius:8, border:'none', background:'#e91e63', color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ background:'rgba(255,255,255,0.2)', borderRadius:4, padding:'2px 8px', fontSize:13 }}>{totalQty}</span>
            <span>Ver pedido</span>
            <span>{fmtCur(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* Mobile cart modal */}
      {isMobile && showMobileCart && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200 }} onClick={()=>setShowMobileCart(false)}>
          <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'#fff', borderRadius:'16px 16px 0 0', maxHeight:'80vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:'12px 16px 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontWeight:700, fontSize:16 }}>Mi pedido</span>
              <button onClick={()=>setShowMobileCart(false)} style={{ border:'none', background:'none', fontSize:24, color:'#6b7280', cursor:'pointer' }}>×</button>
            </div>
            {renderCart()}
          </div>
        </div>
      )}

      {/* DATOS MODAL */}
      {step==='datos' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding: isMobile ? 0 : 16 }}>
          <div style={{ background:'#fff', borderRadius: isMobile ? 0 : 16, padding: isMobile ? '20px 16px' : '28px', maxWidth:480, width:'100%', maxHeight:'100vh', overflowY:'auto', ...(isMobile ? {minHeight:'100vh'} : {}) }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:'#1f2937' }}>Datos de reserva</h2>
              <button onClick={()=>setStep('menu')} style={{ border:'none', background:'none', fontSize:24, color:'#6b7280', cursor:'pointer' }}>×</button>
            </div>

            <div style={{ background:'#f9fafb', borderRadius:8, padding:'12px 14px', marginBottom:20, border:'1px solid #e5e7eb' }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#6b7280', marginBottom:8, textTransform:'uppercase' }}>Resumen del pedido</div>
              {comboValid && dayMenuData && combos.map((c,i)=>{
                const s=dayMenuData.sopas[c.sopaIdx!]; const g=dayMenuData.segundos[c.segundoIdx!]
                return <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}><span style={{ color:'#374151' }}>{c.qty}x {s.nombre} + {g.nombre}</span><span style={{ fontWeight:600 }}>{fmtCur((s.precio+g.precio)*c.qty)}</span></div>
              })}
              {simpleItems.map((ci,i)=>{
                if(!dayMenuData) return null
                const item=ci.type==='extra'?dayMenuData.extra:(ci.type==='sopa'?dayMenuData.sopas:dayMenuData.segundos)[ci.idx]
                if(!item) return null
                return <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}><span style={{ color:'#374151' }}>{ci.qty}x {(item as any).nombre}</span><span style={{ fontWeight:600 }}>{fmtCur((item as any).precio*ci.qty)}</span></div>
              })}
              <div style={{ borderTop:'1px solid #e5e7eb', marginTop:8, paddingTop:8, display:'flex', justifyContent:'space-between', fontWeight:700, fontSize:14 }}>
                <span>Total</span><span>{fmtCur(cartTotal)}</span>
              </div>
            </div>

            {([{k:'nombre',l:'Nombre',p:'María'},{k:'apellido',l:'Apellido',p:'Quispe'},{k:'whatsapp',l:'WhatsApp',p:'70123456',t:'tel'}] as any[]).map(({k,l,p,t})=>(
              <div key={k} style={{ marginBottom:14 }}>
                <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:5, color:'#374151' }}>{l}</label>
                <input type={t||'text'} placeholder={p} value={(customer as any)[k]} onChange={e=>{setCustomer(prev=>({...prev,[k]:e.target.value}));setCustErr(prev=>({...prev,[k]:''}))} } style={{ ...inp, border:`1px solid ${custErr[k]?'#ef4444':'#d1d5db'}` }} />
                {custErr[k]&&<p style={{ color:'#ef4444', fontSize:12, margin:'4px 0 0', fontWeight:500 }}>{custErr[k]}</p>}
              </div>
            ))}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6, color:'#374151' }}>Hora de recojo</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                {['12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30'].map(h=>(
                  <button key={h} onClick={()=>{setCustomer(p=>({...p,hora:h}));setCustErr(p=>({...p,hora:''}))}} style={{ padding:'8px 4px', borderRadius:6, cursor:'pointer', border:`1px solid ${customer.hora===h?'#e91e63':'#d1d5db'}`, background:customer.hora===h?'#fef1f5':'#fff', color:customer.hora===h?'#e91e63':'#374151', fontWeight:600, fontSize:13 }}>{h}</button>
                ))}
              </div>
              {custErr.hora&&<p style={{ color:'#ef4444', fontSize:12, margin:'4px 0 0', fontWeight:500 }}>{custErr.hora}</p>}
            </div>
            <button onClick={handleConfirmData} style={{ width:'100%', padding:'12px 0', borderRadius:8, border:'none', background:'#e91e63', color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer', marginBottom:8 }}>Continuar al pago</button>
            <button onClick={()=>{setStep('menu');setShowMobileCart(false)}} style={{ width:'100%', padding:10, borderRadius:8, border:'1px solid #d1d5db', background:'#fff', color:'#6b7280', cursor:'pointer', fontWeight:500 }}>Volver al menú</button>
          </div>
        </div>
      )}

      {/* PAGO MODAL */}
      {step==='pago' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding: isMobile ? 0 : 16 }}>
          <div style={{ background:'#fff', borderRadius: isMobile ? 0 : 16, padding: isMobile ? '20px 16px' : '28px', maxWidth:440, width:'100%', maxHeight:'100vh', overflowY:'auto', ...(isMobile ? {minHeight:'100vh'} : {}) }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:'#1f2937' }}>Confirmar pago</h2>
              <button onClick={()=>setStep('datos')} style={{ border:'none', background:'none', fontSize:24, color:'#6b7280', cursor:'pointer' }}>×</button>
            </div>

            <div style={{ background:'#f0fdf4', borderRadius:8, padding:'10px 14px', marginBottom:16, border:'1px solid #bbf7d0' }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#166534', marginBottom:4 }}>CLIENTE</div>
              <div style={{ fontWeight:600, fontSize:14, color:'#374151' }}>{customer.nombre} {customer.apellido}</div>
              <div style={{ fontSize:13, color:'#6b7280' }}>Tel: {customer.whatsapp} · {customer.hora}</div>
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', marginBottom:16, borderTop:'1px solid #e5e7eb', borderBottom:'1px solid #e5e7eb' }}>
              <span style={{ color:'#6b7280', fontSize:14 }}>Consumo: {consumo==='local'?'En el local':'Para llevar'}</span>
              <span style={{ fontSize:18, fontWeight:700, color:'#1f2937' }}>Total: {fmtCur(cartTotal)}</span>
            </div>

            <div style={{ fontSize:14, fontWeight:600, marginBottom:12, color:'#374151' }}>Método de pago</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
              <button onClick={()=>handlePay('efectivo')} disabled={submitting} style={{ padding:'16px', borderRadius:8, border:'1px solid #d1d5db', background:'#fff', cursor:'pointer', fontSize:14, fontWeight:600, color:'#374151', opacity:submitting?0.6:1 }}>
                Efectivo
              </button>
              <button
                onClick={()=>restaurante?.qr_url ? handlePay('qr') : null}
                disabled={submitting || !restaurante?.qr_url}
                style={{ padding:'16px', borderRadius:8, border:`1px solid ${restaurante?.qr_url?'#d1d5db':'#e5e7eb'}`, background:restaurante?.qr_url?'#fff':'#f9fafb', cursor:restaurante?.qr_url?'pointer':'not-allowed', fontSize:14, fontWeight:600, color:restaurante?.qr_url?'#374151':'#9ca3af', opacity:submitting?0.6:1 }}>
                Pago QR {!restaurante?.qr_url && <div style={{ fontSize:11, fontWeight:400, color:'#9ca3af' }}>No disponible</div>}
              </button>
            </div>
            <button onClick={()=>setStep('datos')} style={{ width:'100%', padding:10, borderRadius:8, border:'1px solid #d1d5db', background:'#fff', color:'#6b7280', cursor:'pointer', fontWeight:500 }}>Volver</button>
          </div>
        </div>
      )}

      {/* DONE MODAL */}
      {step==='done' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding: isMobile ? 0 : 16 }}>
          <div style={{ background:'#fff', borderRadius: isMobile ? 0 : 16, padding: isMobile ? '24px 16px' : '32px', maxWidth:420, width:'100%', textAlign:'center', maxHeight:'100vh', overflowY:'auto', ...(isMobile ? {minHeight:'100vh', display:'flex', flexDirection:'column' as const, justifyContent:'center'} : {}) }}>
            {payMethod==='qr' ? (
              <>
                <h2 style={{ margin:'0 0 8px', fontWeight:700, fontSize:20, color:'#1f2937' }}>Escanea el QR para pagar</h2>
                <p style={{ color:'#6b7280', fontSize:13, marginBottom:20 }}>
                  Pedido <strong>#{orderId}</strong> · Total: <strong style={{ color:'#e91e63' }}>{fmtCur(finalTotal)}</strong>
                </p>
                {restaurante?.qr_url && (
                  <div style={{ marginBottom:20 }}>
                    <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:12, padding:16, display:'inline-block', marginBottom:12 }}>
                      <img src={restaurante.qr_url} alt="QR" style={{ width: isMobile ? 180 : 220, height: isMobile ? 180 : 220, objectFit:'contain', display:'block' }} />
                    </div>
                    <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
                      <a href={restaurante.qr_url} download target="_blank" rel="noreferrer" style={{ padding:'8px 16px', borderRadius:6, background:'#1f2937', color:'#fff', fontWeight:600, fontSize:13, textDecoration:'none' }}>Descargar QR</a>
                    </div>
                    <div style={{ marginTop:16, background:'#f9fafb', borderRadius:8, padding:12, textAlign:'left', fontSize:13, color:'#6b7280', border:'1px solid #e5e7eb' }}>
                      <div style={{ marginBottom:4 }}>1. Escanea el QR con tu app bancaria</div>
                      <div style={{ marginBottom:4 }}>2. Transfiere exactamente <strong style={{ color:'#1f2937' }}>{fmtCur(finalTotal)}</strong></div>
                      <div>3. Guarda el comprobante</div>
                    </div>
                  </div>
                )}
                <div style={{ background:'#f9fafb', borderRadius:10, padding:16, textAlign:'left', marginTop:16, marginBottom:16, border:'1px solid #e5e7eb' }}>
                  <div style={{ fontSize:13, color:'#6b7280', marginBottom:8 }}><strong style={{ color:'#1f2937' }}>Nombre:</strong> {customer.nombre} {customer.apellido}</div>
                  <div style={{ fontSize:13, color:'#6b7280', marginBottom:8 }}><strong style={{ color:'#1f2937' }}>WhatsApp:</strong> {customer.whatsapp}</div>
                  <div style={{ fontSize:13, color:'#6b7280', marginBottom:8 }}><strong style={{ color:'#1f2937' }}>Hora de recojo:</strong> {customer.hora}</div>
                  <div style={{ fontSize:13, color:'#6b7280', marginBottom:8 }}><strong style={{ color:'#1f2937' }}>Consumo:</strong> {consumo==='local'?'En el local':'Para llevar'}</div>
                  <div style={{ fontSize:13, color:'#6b7280' }}><strong style={{ color:'#1f2937' }}>Total:</strong> <span style={{ color:'#e91e63', fontWeight:700 }}>{fmtCur(finalTotal)}</span></div>
                </div>
                <button onClick={()=>setStep('menu')} style={{ width:'100%', padding:12, borderRadius:8, border:'none', background:'#e91e63', color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer' }}>
                  Listo, ya pagué
                </button>
                {restaurante?.telefono && (
                  <a href={`https://wa.me/591${restaurante.telefono}?text=${encodeURIComponent(`Hola! Acabo de hacer mi pedido #${orderId} por ${fmtCur(finalTotal)}. ${consumo==='local'?'Comeré en el local':'Pasaré a recoger'} a las ${customer.hora}. Gracias!`)}`} target="_blank" rel="noreferrer" style={{ display:'block', width:'100%', padding:12, borderRadius:8, border:'1px solid #25d366', background:'#fff', color:'#25d366', fontWeight:700, fontSize:15, cursor:'pointer', textAlign:'center', textDecoration:'none', marginTop:8, boxSizing:'border-box' }}>
                    Confirmar por WhatsApp
                  </a>
                )}
              </>
            ) : (
              <>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'#dcfce7', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h2 style={{ margin:'0 0 8px', fontWeight:700, fontSize:20, color:'#1f2937' }}>Reserva confirmada</h2>
                <p style={{ color:'#6b7280', fontSize:14, marginBottom:4, lineHeight:1.6 }}>
                  Pedido <strong>#{orderId}</strong> registrado.<br/>
                  {consumo==='local'?'Te esperamos en el local.':'Pasarás a recogerlo.'}<br/>
                  <strong>Paga en efectivo al recoger.</strong>
                </p>
                <div style={{ background:'#f9fafb', borderRadius:10, padding:16, textAlign:'left', marginTop:16, marginBottom:16, border:'1px solid #e5e7eb' }}>
                  <div style={{ fontSize:13, color:'#6b7280', marginBottom:8 }}><strong style={{ color:'#1f2937' }}>Nombre:</strong> {customer.nombre} {customer.apellido}</div>
                  <div style={{ fontSize:13, color:'#6b7280', marginBottom:8 }}><strong style={{ color:'#1f2937' }}>WhatsApp:</strong> {customer.whatsapp}</div>
                  <div style={{ fontSize:13, color:'#6b7280', marginBottom:8 }}><strong style={{ color:'#1f2937' }}>Hora de recojo:</strong> {customer.hora}</div>
                  <div style={{ fontSize:13, color:'#6b7280', marginBottom:8 }}><strong style={{ color:'#1f2937' }}>Consumo:</strong> {consumo==='local'?'En el local':'Para llevar'}</div>
                  <div style={{ fontSize:13, color:'#6b7280' }}><strong style={{ color:'#1f2937' }}>Total:</strong> <span style={{ color:'#e91e63', fontWeight:700 }}>{fmtCur(finalTotal)}</span></div>
                </div>
                <button onClick={()=>setStep('menu')} style={{ width:'100%', padding:12, borderRadius:8, border:'none', background:'#e91e63', color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer' }}>
                  Volver al menú
                </button>
                {restaurante?.telefono && (
                  <a href={`https://wa.me/591${restaurante.telefono}?text=${encodeURIComponent(`Hola! Acabo de hacer mi pedido #${orderId} por ${fmtCur(finalTotal)}. ${consumo==='local'?'Comeré en el local':'Pasaré a recoger'} a las ${customer.hora}. Gracias!`)}`} target="_blank" rel="noreferrer" style={{ display:'block', width:'100%', padding:12, borderRadius:8, border:'1px solid #25d366', background:'#fff', color:'#25d366', fontWeight:700, fontSize:15, cursor:'pointer', textAlign:'center', textDecoration:'none', marginTop:8, boxSizing:'border-box' }}>
                    Confirmar por WhatsApp
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ marginTop:48, padding: isMobile ? '60px 16px 20px' : '20px 24px', textAlign:'center', borderTop:'1px solid #e5e7eb', background:'#fff' }}>
        <p style={{ margin:0, fontSize:12, color:'#9ca3af' }}>© 2026 SSH Soluciones Bolivia — Derechos reservados</p>
      </footer>
    </div>
  )
}
