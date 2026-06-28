import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getMenuBySlug, getDiasBySlug, createPedido } from '@/lib/api'
import { fmtCur, genId } from '@/lib/utils'
import type { MenuDia, Dia, Combo, PedidoItem, Consumo, MetodoPago } from '@/types'

// ─── StockBadge ───────────────────────────────────────────────────────────────
function StockBadge({ stock, init, small }: { stock: number; init: number; small?: boolean }) {
  const pct = init > 0 ? (stock / init) * 100 : 0
  const col = pct > 50 ? '#22c55e' : pct > 20 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop: small?2:6 }}>
      <div style={{ flex:1, height:small?4:6, background:'#e5e7eb', borderRadius:99, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:col, borderRadius:99 }} />
      </div>
      <span style={{ fontSize:small?10:11, fontWeight:700, color:col, minWidth:56, whiteSpace:'nowrap' }}>
        {stock === 0 ? 'AGOTADO' : `${stock} disponibles`}
      </span>
    </div>
  )
}

// ─── CompletoPicker ───────────────────────────────────────────────────────────
function CompletoPicker({ dayMenu, combos, onSave, isMobile }: {
  dayMenu: MenuDia; combos: Combo[]; onSave: (c: Combo[]) => void; isMobile: boolean
}) {
  const { sopas, segundos } = dayMenu
  const add = () => onSave([...combos, { sopaIdx:null, segundoIdx:null, qty:1 }])
  const remove = (i: number) => onSave(combos.filter((_,idx)=>idx!==i))
  const setQty = (i: number, qty: number) => {
    if (qty < 1) { remove(i); return }
    const c = combos[i]
    const maxS = c.sopaIdx!==null ? sopas[c.sopaIdx!].stock - combos.reduce((s,x,idx)=>idx!==i&&x.sopaIdx===c.sopaIdx?s+x.qty:s,0) : Infinity
    const maxG = c.segundoIdx!==null ? segundos[c.segundoIdx!].stock - combos.reduce((s,x,idx)=>idx!==i&&x.segundoIdx===c.segundoIdx?s+c.qty:s,0) : Infinity
    onSave(combos.map((x,idx)=>idx===i?{...x,qty:Math.min(qty,Math.max(1,Math.min(maxS,maxG)))}:x))
  }
  const pickSopa = (ci: number, si: number) => {
    const upd = combos.map((c,i)=>i===ci?{...c,sopaIdx:c.sopaIdx===si?null:si}:c)
    const cur = upd[ci]
    if (cur.sopaIdx!==null && cur.segundoIdx!==null) {
      const dup = upd.findIndex((c,i)=>i!==ci&&c.sopaIdx===cur.sopaIdx&&c.segundoIdx===cur.segundoIdx)
      if (dup>=0) { onSave(upd.map((c,i)=>i===dup?{...c,qty:c.qty+cur.qty}:c).filter((_,i)=>i!==ci)); return }
    }
    onSave(upd)
  }
  const pickSeg = (ci: number, gi: number) => {
    const upd = combos.map((c,i)=>i===ci?{...c,segundoIdx:c.segundoIdx===gi?null:gi}:c)
    const cur = upd[ci]
    if (cur.sopaIdx!==null && cur.segundoIdx!==null) {
      const dup = upd.findIndex((c,i)=>i!==ci&&c.sopaIdx===cur.sopaIdx&&c.segundoIdx===cur.segundoIdx)
      if (dup>=0) { onSave(upd.map((c,i)=>i===dup?{...c,qty:c.qty+cur.qty}:c).filter((_,i)=>i!==ci)); return }
    }
    onSave(upd)
  }

  const allDone = combos.length>0 && combos.every(c=>c.sopaIdx!==null&&c.segundoIdx!==null)
  const total = combos.reduce((sum,c)=>{
    const s=c.sopaIdx!==null?sopas[c.sopaIdx!]:null; const g=c.segundoIdx!==null?segundos[c.segundoIdx!]:null
    return s&&g?sum+(s.precio+g.precio)*c.qty:sum
  },0)

  return (
    <div style={{ background:'#fff', borderRadius:20, border:`2px solid ${allDone?'#f97316':'#fed7aa'}`, padding: isMobile ? 16 : 24, marginBottom:24, boxShadow:allDone?'0 8px 32px rgba(249,115,22,0.18)':'0 2px 10px rgba(0,0,0,0.06)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize: isMobile ? 28 : 36 }}>🍽️</span>
          <div>
            <span style={{ fontSize:10, fontWeight:800, letterSpacing:1.5, background:'linear-gradient(135deg,#f97316,#ef4444)', color:'#fff', padding:'3px 12px', borderRadius:99, textTransform:'uppercase' }}>Menú Completo</span>
            <h2 style={{ margin:'6px 0 2px', fontSize: isMobile ? 17 : 20, fontWeight:900 }}>Armá tu Almuerzo</h2>
            <p style={{ margin:0, fontSize:13, color:'#64748b' }}>Elegí 1 sopa + 1 segundo por combinación</p>
          </div>
        </div>
        {combos.length>0 && <button onClick={()=>onSave([])} style={{ border:'none', background:'#fee2e2', color:'#ef4444', borderRadius:10, padding:'6px 14px', cursor:'pointer', fontWeight:700, fontSize:12 }}>Limpiar todo</button>}
      </div>

      {/* Reference - available items */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:12, marginBottom:20, background:'#f8fafc', borderRadius:14, padding: isMobile ? 12 : 14 }}>
        {([['🥣 Sopas del día','#3b82f6',sopas],['🍳 Segundos del día','#f97316',segundos]] as const).map(([label, col, items])=>(
          <div key={label as string}>
            <div style={{ fontSize:11, fontWeight:800, color:col as string, textTransform:'uppercase', marginBottom:8 }}>{label as string}</div>
            {(items as any[]).map((s: any,i: number)=>(
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 10px', background:'#fff', borderRadius:8, marginBottom:4, border:`1.5px solid ${col as string}33` }}>
                <span style={{ fontSize:13, fontWeight:700 }}>{s.emoji} {s.nombre}</span>
                <span style={{ fontSize:12, fontWeight:800, color:col as string }}>{fmtCur(s.precio)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Combo rows */}
      {combos.length === 0 && (
        <div style={{ textAlign:'center', padding: isMobile ? '20px 10px' : '24px', background:'#fffbf5', borderRadius:14, border:'2px dashed #fed7aa', marginBottom:16 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>👇</div>
          <p style={{ margin:0, fontWeight:700, color:'#9a3412', fontSize:14 }}>Toca el botón de abajo para armar tu almuerzo</p>
          <p style={{ margin:'4px 0 0', fontSize:12, color:'#94a3b8' }}>Podés pedir varias combinaciones distintas</p>
        </div>
      )}

      {combos.map((combo, ci) => {
        const sopaObj = combo.sopaIdx!==null ? sopas[combo.sopaIdx!] : null
        const segObj  = combo.segundoIdx!==null ? segundos[combo.segundoIdx!] : null
        const done = !!sopaObj && !!segObj
        const otherS = combos.reduce((s,c,idx)=>idx!==ci&&c.sopaIdx===combo.sopaIdx?s+c.qty:s,0)
        const otherG = combos.reduce((s,c,idx)=>idx!==ci&&c.segundoIdx===combo.segundoIdx?s+c.qty:s,0)
        const maxQty = done ? Math.min(sopaObj!.stock-otherS, segObj!.stock-otherG) : 1
        return (
          <div key={ci} style={{ border:`2px solid ${done?'#f97316':'#e2e8f0'}`, borderRadius:16, padding: isMobile ? 14 : 16, marginBottom:12, background:done?'#fffbf5':'#fafafa' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, flexWrap:'wrap', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:done?'linear-gradient(135deg,#f97316,#ef4444)':'#e2e8f0', color:done?'#fff':'#94a3b8', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:13 }}>{ci+1}</div>
                <span style={{ fontWeight:800, fontSize:13 }}>{done?`${sopaObj!.emoji} ${sopaObj!.nombre} + ${segObj!.emoji} ${segObj!.nombre}`:`Combinación #${ci+1}`}</span>
                {done && <span style={{ fontSize:11, background:'#dcfce7', color:'#166534', borderRadius:99, padding:'2px 8px', fontWeight:700 }}>✓ Listo</span>}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                {done && (<>
                  <button onClick={()=>setQty(ci,combo.qty-1)} style={{ width:32, height:32, borderRadius:8, border:'2px solid #f97316', background:'#fff', color:'#f97316', fontWeight:900, cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                  <span style={{ fontWeight:900, fontSize:16, minWidth:24, textAlign:'center' }}>{combo.qty}</span>
                  <button onClick={()=>combo.qty<maxQty&&setQty(ci,combo.qty+1)} disabled={combo.qty>=maxQty} style={{ width:32, height:32, borderRadius:8, border:`2px solid ${combo.qty>=maxQty?'#e2e8f0':'#f97316'}`, background:combo.qty>=maxQty?'#f1f5f9':'#f97316', color:combo.qty>=maxQty?'#94a3b8':'#fff', fontWeight:900, cursor:combo.qty>=maxQty?'not-allowed':'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                  <span style={{ fontSize:13, fontWeight:900, color:'#f97316', marginLeft:4 }}>{fmtCur((sopaObj!.precio+segObj!.precio)*combo.qty)}</span>
                </>)}
                <button onClick={()=>remove(ci)} style={{ border:'none', background:'#fee2e2', color:'#ef4444', borderRadius:8, padding:'4px 10px', cursor:'pointer', fontWeight:700, fontSize:12, marginLeft:4 }}>Quitar</button>
              </div>
            </div>
            {!done && (
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:10 }}>
                {([['sopa','🥣 Elegí tu Sopa','#3b82f6',sopas,combo.sopaIdx,(si:number)=>pickSopa(ci,si)],
                   ['segundo','🍳 Elegí tu Segundo','#f97316',segundos,combo.segundoIdx,(gi:number)=>pickSeg(ci,gi)]] as const).map(([_key,label,col,items,selIdx,pick])=>(
                  <div key={label as string}>
                    <div style={{ fontSize:12, fontWeight:700, color:col as string, textTransform:'uppercase', marginBottom:6 }}>{label as string}</div>
                    {(items as any[]).map((s: any, si: number) => {
                      const used = combos.reduce((sum,c,idx)=>idx!==ci&&(_key==='sopa'?c.sopaIdx:c.segundoIdx)===si?sum+c.qty:sum,0)
                      const avail = s.stock-used; const noStock=avail<=0
                      return (
                        <button key={si} onClick={()=>!noStock&&(pick as any)(si)} style={{ width:'100%', marginBottom:5, padding:'10px 12px', borderRadius:10, border:`2px solid ${selIdx===si?col:'#e2e8f0'}`, background:selIdx===si?`${col as string}18`:'#fff', color:noStock?'#cbd5e1':selIdx===si?col:'#374151', fontWeight:selIdx===si?800:600, fontSize:13, cursor:noStock?'not-allowed':'pointer', textAlign:'left', display:'flex', justifyContent:'space-between', opacity:noStock?0.5:1 }}>
                          <span>{s.emoji} {s.nombre}</span>
                          <span style={{ fontSize:12, fontWeight:800 }}>{fmtCur(s.precio)} · {noStock?'Agotado':`${avail} disp.`}</span>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
            {done && (
              <button onClick={()=>onSave(combos.map((c,i)=>i===ci?{...c,sopaIdx:null,segundoIdx:null}:c))} style={{ border:'none', background:'#f1f5f9', color:'#64748b', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontWeight:600, fontSize:12 }}>Cambiar selección</button>
            )}
          </div>
        )
      })}

      <button onClick={add} style={{ width:'100%', padding:'12px 0', borderRadius:12, border:'2px dashed #fed7aa', background:'#fffbf5', color:'#f97316', fontWeight:800, fontSize:15, cursor:'pointer', marginBottom:16 }}>+ Agregar almuerzo</button>

      <div style={{ borderTop:'2px dashed #fed7aa', paddingTop:14, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
        <div>
          {allDone ? (<><div style={{ fontSize:12, color:'#94a3b8' }}>{combos.length} combinación{combos.length>1?'es':''} · {combos.reduce((s,c)=>s+c.qty,0)} almuerzo{combos.reduce((s,c)=>s+c.qty,0)>1?'s':''}</div><div style={{ fontSize:26, fontWeight:900, color:'#f97316' }}>{fmtCur(total)}</div></>)
          : combos.length===0 ? <div style={{ fontSize:13, color:'#94a3b8', fontStyle:'italic' }}>Agrega almuerzos arriba</div>
          : <div style={{ fontSize:13, color:'#f59e0b', fontWeight:700 }}>Completa todas las combinaciones</div>}
        </div>
        {allDone && <div style={{ background:'#dcfce7', borderRadius:12, padding:'8px 14px', fontSize:13, fontWeight:700, color:'#166534' }}>✓ Listo para pedir</div>}
      </div>
    </div>
  )
}

// ─── MenuPage (main) ──────────────────────────────────────────────────────────
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
  const dayMenuData = menu.find(m=>m.dia.nombre===activeDay)
  const today = (['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'] as const)[new Date().getDay()]

  const cartKeys = Object.keys(cart)
  const simpleItems = cartKeys.filter(k=>!k.endsWith('-completo')).map(k=>cart[k])
  const comboValid = combos.length>0 && combos.every(c=>c.sopaIdx!==null&&c.segundoIdx!==null)
  const hasItems = simpleItems.length>0 || comboValid

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

  function toggleSimple(type: 'sopa'|'segundo'|'extra', idx: number) {
    const key=`${activeDay}-${type}-${idx}`
    setCart(prev=>{ const n={...prev}; if(n[key]) delete n[key]; else n[key]={type,idx,qty:1,day:activeDay}; return n })
  }
  function setQty(key: string, qty: number) {
    setCart(prev=>({...prev,[key]:{...prev[key],qty}}))
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

  const [finalTotal, setFinalTotal] = useState(0)

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

  function renderReceiptItems(items: PedidoItem[]) {
    const groups: Record<number,PedidoItem[]>={}
    items.filter(i=>i.combo_num!=null).forEach(i=>{const n=i.combo_num!;if(!groups[n])groups[n]=[];groups[n].push(i)})
    const others=items.filter(i=>i.combo_num==null)
    return (<>
      {Object.entries(groups).map(([num,its])=>(<div key={num} style={{ marginBottom:8, background:'#fff7ed', borderRadius:10, padding:'8px 10px', border:'1.5px solid #fed7aa' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}><span style={{ fontSize:13, fontWeight:800, color:'#c2410c' }}>🍽️ Almuerzo #{num} {its[0].cantidad>1?`× ${its[0].cantidad}`:''}</span><span style={{ fontSize:13, fontWeight:900, color:'#f97316' }}>{fmtCur(its.reduce((s,i)=>s+i.precio*i.cantidad,0))}</span></div>
        {its.map((it,i)=>(<div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12, paddingLeft:6 }}><span style={{ color:'#64748b' }}>{it.tipo_linea==='sopa'?'🥣':'🍳'} {it.nombre}</span><span style={{ color:'#94a3b8' }}>{fmtCur(it.precio)}</span></div>))}
      </div>))}
      {others.map((it,i)=>(<div key={i} style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:14 }}><span>{it.cantidad}x {it.nombre}</span><span style={{ fontWeight:700 }}>{fmtCur(it.precio*it.cantidad)}</span></div>))}
    </>)
  }

  if(loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', gap:12 }}>
      <div style={{ fontSize:48, animation:'spin 1s linear infinite' }}>🍜</div>
      <p style={{ fontSize:16, color:'#94a3b8', fontWeight:600 }}>Cargando menú...</p>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
  if(!menu.length) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', gap:12, padding:20, textAlign:'center' }}>
      <div style={{ fontSize:48 }}>😕</div>
      <p style={{ fontSize:18, color:'#ef4444', fontWeight:700 }}>Restaurante no encontrado</p>
      <p style={{ fontSize:14, color:'#94a3b8' }}>Verifica que el link sea correcto</p>
    </div>
  )

  const inp: React.CSSProperties={ width:'100%', padding:'11px 14px', borderRadius:12, border:'2px solid #e2e8f0', fontSize:15, boxSizing:'border-box', outline:'none' }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#fff7ed 0%,#fef3c7 30%,#fff 60%)', fontFamily:'Georgia,serif' }}>
      {/* NAV */}
      <nav style={{ background:'rgba(255,255,255,0.93)', backdropFilter:'blur(10px)', borderBottom:'2px solid #fed7aa', padding: isMobile ? '0 12px' : '0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100, height:60 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {restaurante?.logo_url
            ? <img src={restaurante.logo_url} alt="" style={{ width:32, height:32, borderRadius:8, objectFit:'cover' }} />
            : <span style={{ fontSize:24 }}>🍜</span>}
          <div>
            <div style={{ fontWeight:900, fontSize: isMobile ? 15 : 18, color:'#9a3412' }}>{restaurante?.nombre ?? 'Menú del día'}</div>
            {restaurante?.ciudad && <div style={{ fontSize:10, color:'#c2410c', fontWeight:600 }}>{restaurante.ciudad}</div>}
          </div>
        </div>
        {hasItems && <div style={{ background:'#f97316', color:'#fff', borderRadius:20, padding:'6px 14px', fontSize:13, fontWeight:800 }}>🛒 {fmtCur(cartTotal)}</div>}
      </nav>

      {/* HERO */}
      <div style={{ background:'linear-gradient(135deg,#9a3412,#c2410c,#ea580c)', padding: isMobile ? '24px 16px' : '32px 24px', textAlign:'center', color:'#fff' }}>
        <h1 style={{ margin:'0 0 6px', fontSize: isMobile ? 22 : 30, fontWeight:900 }}>Menú de la Semana</h1>
        <p style={{ margin:0, opacity:0.85, fontSize: isMobile ? 13 : 14 }}>Reserva tu almuerzo · Pago en efectivo o QR</p>
      </div>

      <div style={{ maxWidth:980, margin:'0 auto', padding: isMobile ? '16px 12px' : '24px 16px' }}>
        {/* DAY TABS */}
        <div style={{ display:'flex', gap:8, marginBottom:16, overflowX:'auto', paddingBottom:4, WebkitOverflowScrolling:'touch' }}>
          {activeDays.map(d=>(
            <button key={d.id} onClick={()=>{setActiveDay(d.nombre);setCart({});setCombos([])}} style={{ flexShrink:0, padding: isMobile ? '8px 16px' : '10px 20px', borderRadius:30, border:'none', cursor:'pointer', fontWeight:800, fontSize:13, background:activeDay===d.nombre?'linear-gradient(135deg,#f97316,#ef4444)':'#fff', color:activeDay===d.nombre?'#fff':'#64748b', boxShadow:activeDay===d.nombre?'0 4px 15px rgba(249,115,22,0.35)':'0 1px 4px rgba(0,0,0,0.08)' }}>
              {d.nombre===today?`⭐ ${d.nombre}`:d.nombre}
            </button>
          ))}
        </div>

        {/* TYPE SELECTOR */}
        <div style={{ background:'#fff', borderRadius:16, padding: isMobile ? 10 : 14, marginBottom:18, boxShadow:'0 1px 8px rgba(0,0,0,0.06)', display:'flex', gap:6, flexWrap:'wrap' }}>
          {([['completo','🍽️ Completo'],['sopa','🥣 Sopa'],['segundo','🍳 Segundo'],['extra','🥤 Extra']] as const).map(([v,l])=>(
            <button key={v} onClick={()=>setMenuType(v)} style={{ padding: isMobile ? '7px 12px' : '8px 16px', borderRadius:20, border:`2px solid ${menuType===v?'#f97316':'#e2e8f0'}`, background:menuType===v?'#fff7ed':'#fff', color:menuType===v?'#f97316':'#64748b', fontWeight:700, cursor:'pointer', fontSize: isMobile ? 12 : 13, flex: isMobile ? '1 1 auto' : 'none', textAlign:'center' }}>{l}</button>
          ))}
        </div>

        {/* CONTENT */}
        {dayMenuData && (<>
          {menuType==='completo' && <CompletoPicker dayMenu={dayMenuData} combos={combos} onSave={setCombos} isMobile={isMobile} />}

          {(menuType==='sopa'||menuType==='segundo') && (
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(280px,1fr))', gap:14, marginBottom:22 }}>
              {(menuType==='sopa'?dayMenuData.sopas:dayMenuData.segundos).map((item,idx)=>{
                const key=`${activeDay}-${menuType}-${idx}`; const sel=!!cart[key]; const qty=cart[key]?.qty??1
                return (
                  <div key={key} onClick={()=>item.stock>0&&toggleSimple(menuType,idx)} style={{ background:item.stock===0?'#f1f5f9':sel?'#fff7ed':'#fff', border:`2px solid ${sel?'#f97316':item.stock===0?'#e2e8f0':'#e5e7eb'}`, borderRadius:16, padding: isMobile ? 16 : 20, cursor:item.stock===0?'not-allowed':'pointer', opacity:item.stock===0?0.6:1, position:'relative' }}>
                    {sel&&<div style={{ position:'absolute',top:10,right:10,background:'#f97316',color:'#fff',borderRadius:'50%',width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900 }}>✓</div>}
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ fontSize:36 }}>{item.emoji}</div>
                      <div style={{ flex:1 }}>
                        <span style={{ fontSize:10,fontWeight:700,letterSpacing:1,background:menuType==='sopa'?'#3b82f6':'#f97316',color:'#fff',padding:'2px 8px',borderRadius:99,textTransform:'uppercase' }}>{menuType==='sopa'?'Sopa':'Segundo'}</span>
                        <h3 style={{ margin:'4px 0 2px',fontSize:15,fontWeight:800 }}>{item.nombre}</h3>
                        {item.descripcion && <p style={{ fontSize:12,color:'#64748b',margin:'0 0 4px' }}>{item.descripcion}</p>}
                        <div style={{ fontSize:20,fontWeight:900,color:'#f97316' }}>{fmtCur(item.precio)}</div>
                      </div>
                    </div>
                    <StockBadge stock={item.stock} init={item.stock_inicial} />
                    {sel&&<div style={{ marginTop:12,display:'flex',alignItems:'center',gap:8 }} onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>setQty(key,Math.max(1,qty-1))} style={{ width:36,height:36,borderRadius:10,border:'2px solid #f97316',background:'#fff',color:'#f97316',fontWeight:900,cursor:'pointer',fontSize:18 }}>−</button>
                      <span style={{ fontWeight:800,fontSize:18,minWidth:24,textAlign:'center' }}>{qty}</span>
                      <button onClick={()=>setQty(key,Math.min(item.stock,qty+1))} style={{ width:36,height:36,borderRadius:10,border:'2px solid #f97316',background:'#f97316',color:'#fff',fontWeight:900,cursor:'pointer',fontSize:18 }}>+</button>
                    </div>}
                  </div>
                )
              })}
            </div>
          )}

          {menuType==='extra' && dayMenuData.extra && (()=>{
            const item=dayMenuData.extra!; const key=`${activeDay}-extra-0`; const sel=!!cart[key]; const qty=cart[key]?.qty??1
            return (<div style={{ maxWidth:400 }}>
              <div onClick={()=>item.stock>0&&toggleSimple('extra',0)} style={{ background:item.stock===0?'#f1f5f9':sel?'#fff7ed':'#fff', border:`2px solid ${sel?'#f97316':item.stock===0?'#e2e8f0':'#e5e7eb'}`, borderRadius:16, padding: isMobile ? 16 : 20, cursor:item.stock===0?'not-allowed':'pointer', opacity:item.stock===0?0.6:1, position:'relative' }}>
                {sel&&<div style={{ position:'absolute',top:10,right:10,background:'#f97316',color:'#fff',borderRadius:'50%',width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900 }}>✓</div>}
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ fontSize:36 }}>{item.emoji}</div>
                  <div style={{ flex:1 }}>
                    <span style={{ fontSize:10,fontWeight:700,background:'#8b5cf6',color:'#fff',padding:'2px 8px',borderRadius:99 }}>Extra</span>
                    <h3 style={{ margin:'4px 0 2px',fontSize:15,fontWeight:800 }}>{item.nombre}</h3>
                    {item.descripcion && <p style={{ fontSize:12,color:'#64748b',margin:'0 0 4px' }}>{item.descripcion}</p>}
                    <div style={{ fontSize:20,fontWeight:900,color:'#f97316' }}>{fmtCur(item.precio)}</div>
                  </div>
                </div>
                <StockBadge stock={item.stock} init={item.stock_inicial} />
                {sel&&<div style={{ marginTop:12,display:'flex',alignItems:'center',gap:8 }} onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>setQty(key,Math.max(1,qty-1))} style={{ width:36,height:36,borderRadius:10,border:'2px solid #f97316',background:'#fff',color:'#f97316',fontWeight:900,cursor:'pointer',fontSize:18 }}>−</button>
                  <span style={{ fontWeight:800,fontSize:18,minWidth:24,textAlign:'center' }}>{qty}</span>
                  <button onClick={()=>setQty(key,Math.min(item.stock,qty+1))} style={{ width:36,height:36,borderRadius:10,border:'2px solid #f97316',background:'#f97316',color:'#fff',fontWeight:900,cursor:'pointer',fontSize:18 }}>+</button>
                </div>}
              </div>
            </div>)
          })()}
        </>)}

        {/* CART */}
        {hasItems && (
          <div style={{ background:'#fff', borderRadius:20, padding: isMobile ? 16 : 22, marginTop:8, boxShadow:'0 4px 24px rgba(249,115,22,0.14)', border:'2px solid #fed7aa' }}>
            <h3 style={{ margin:'0 0 14px', fontSize:16, fontWeight:900, color:'#9a3412' }}>🛒 Tu Pedido</h3>
            <div style={{ marginBottom:14 }}>
              {comboValid && dayMenuData && (<div style={{ marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 12px', background:'linear-gradient(135deg,#fff7ed,#fef3c7)', borderRadius:10, border:'1.5px solid #fed7aa', marginBottom:4 }}>
                  <span style={{ fontSize:13, fontWeight:800, color:'#9a3412' }}>🍽️ Menú Completo · {combos.reduce((s,c)=>s+c.qty,0)} almuerzo{combos.reduce((s,c)=>s+c.qty,0)>1?'s':''}</span>
                  <span style={{ fontWeight:900, color:'#f97316' }}>{fmtCur(comboTotal())}</span>
                </div>
                {combos.map((c,i)=>{const s=dayMenuData.sopas[c.sopaIdx!];const g=dayMenuData.segundos[c.segundoIdx!];return(<div key={i} style={{ marginBottom:3,padding:'4px 10px',marginLeft:8,background:'#fffbf5',borderRadius:8,border:'1px solid #fed7aa',fontSize:11 }}><strong style={{ color:'#c2410c' }}>{c.qty>1?`${c.qty}×`:''} {s.emoji} {s.nombre} + {g.emoji} {g.nombre}</strong> <span style={{ color:'#f97316',fontWeight:900 }}>{fmtCur((s.precio+g.precio)*c.qty)}</span></div>)})}
              </div>)}
              {simpleItems.map((ci,i)=>{
                if(!dayMenuData) return null
                const item=ci.type==='extra'?dayMenuData.extra:(ci.type==='sopa'?dayMenuData.sopas:dayMenuData.segundos)[ci.idx]
                if(!item) return null
                return(<div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, padding:'8px 12px', background:'#fff7ed', borderRadius:10 }}><span style={{ fontSize:13, fontWeight:600 }}>{(item as any).emoji} {ci.qty}x {(item as any).nombre}</span><span style={{ fontWeight:800, color:'#f97316' }}>{fmtCur((item as any).precio*ci.qty)}</span></div>)
              })}
            </div>
            <div style={{ marginBottom:14 }}>
              <p style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>¿Cómo lo consumirás?</p>
              <div style={{ display:'flex', gap:10 }}>
                {(['local','llevar'] as const).map(v=>(
                  <button key={v} onClick={()=>setConsumo(v)} style={{ flex:1, padding:'10px 8px', borderRadius:12, cursor:'pointer', border:`2px solid ${consumo===v?'#f97316':'#e2e8f0'}`, background:consumo===v?'#fff7ed':'#fff', color:consumo===v?'#f97316':'#64748b', fontWeight:700, fontSize:13 }}>
                    {v==='local'?'🍽️ En el local':'📦 Para llevar'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <span style={{ fontWeight:800, fontSize:17 }}>Total:</span>
              <span style={{ fontWeight:900, fontSize:24, color:'#f97316' }}>{fmtCur(cartTotal)}</span>
            </div>
            <button onClick={()=>setStep('datos')} style={{ width:'100%', padding:'14px 0', borderRadius:14, border:'none', background:'linear-gradient(135deg,#f97316,#ef4444)', color:'#fff', fontWeight:900, fontSize:16, cursor:'pointer', boxShadow:'0 4px 20px rgba(249,115,22,0.35)' }}>
              Confirmar Reserva →
            </button>
          </div>
        )}
      </div>

      {/* DATOS MODAL */}
      {step==='datos' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding: isMobile ? 8 : 16 }}>
          <div style={{ background:'#fff', borderRadius:24, padding: isMobile ? 20 : 30, maxWidth:460, width:'100%', boxShadow:'0 25px 60px rgba(0,0,0,0.3)', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ textAlign:'center', marginBottom:18 }}><div style={{ fontSize:34 }}>👤</div><h2 style={{ margin:'8px 0 4px', fontSize:20, fontWeight:900 }}>Datos para tu Reserva</h2></div>
            <div style={{ background:'#fff7ed', border:'2px solid #fed7aa', borderRadius:14, padding:'12px 14px', marginBottom:16 }}>
              <p style={{ margin:'0 0 8px', fontSize:11, fontWeight:800, color:'#c2410c' }}>RESUMEN</p>
              {renderReceiptItems(buildItems())}
              <div style={{ borderTop:'1px dashed #fed7aa', marginTop:8, paddingTop:8, display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontWeight:800 }}>Total</span>
                <span style={{ fontWeight:900, fontSize:16, color:'#f97316' }}>{fmtCur(cartTotal)}</span>
              </div>
            </div>
            {([{k:'nombre',l:'Nombre',p:'Ej. María',icon:'👤'},{k:'apellido',l:'Apellido',p:'Ej. Quispe',icon:'👤'},{k:'whatsapp',l:'WhatsApp',p:'Ej. 70123456',icon:'📱',t:'tel'}] as any[]).map(({k,l,p,icon,t})=>(
              <div key={k} style={{ marginBottom:14 }}>
                <label style={{ fontSize:13, fontWeight:700, display:'block', marginBottom:5 }}>{icon} {l}</label>
                <input type={t||'text'} placeholder={p} value={(customer as any)[k]} onChange={e=>{setCustomer(prev=>({...prev,[k]:e.target.value}));setCustErr(prev=>({...prev,[k]:''}))} } style={{ ...inp, border:`2px solid ${custErr[k]?'#ef4444':'#e2e8f0'}`, background:custErr[k]?'#fff5f5':'#fff' }} />
                {custErr[k]&&<p style={{ color:'#ef4444', fontSize:12, margin:'4px 0 0', fontWeight:600 }}>{custErr[k]}</p>}
              </div>
            ))}
            <div style={{ marginBottom:18 }}>
              <label style={{ fontSize:13, fontWeight:700, display:'block', marginBottom:6 }}>🕐 Hora de recojo / llegada</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                {['12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30'].map(h=>(
                  <button key={h} onClick={()=>{setCustomer(p=>({...p,hora:h}));setCustErr(p=>({...p,hora:''}))}} style={{ padding:'10px 4px', borderRadius:10, cursor:'pointer', border:`2px solid ${customer.hora===h?'#f97316':'#e2e8f0'}`, background:customer.hora===h?'#fff7ed':'#fff', color:customer.hora===h?'#f97316':'#64748b', fontWeight:800, fontSize:14 }}>{h}</button>
                ))}
              </div>
              {custErr.hora&&<p style={{ color:'#ef4444', fontSize:12, margin:'6px 0 0', fontWeight:600 }}>{custErr.hora}</p>}
            </div>
            <button onClick={handleConfirmData} style={{ width:'100%', padding:'14px 0', borderRadius:14, border:'none', background:'linear-gradient(135deg,#f97316,#ef4444)', color:'#fff', fontWeight:900, fontSize:16, cursor:'pointer', marginBottom:10 }}>Continuar al Pago →</button>
            <button onClick={()=>setStep('menu')} style={{ width:'100%', padding:12, borderRadius:12, border:'none', background:'#f1f5f9', color:'#64748b', cursor:'pointer', fontWeight:600 }}>← Volver al menú</button>
          </div>
        </div>
      )}

      {/* PAGO MODAL */}
      {step==='pago' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding: isMobile ? 8 : 16 }}>
          <div style={{ background:'#fff', borderRadius:24, padding: isMobile ? 20 : 30, maxWidth:440, width:'100%', boxShadow:'0 25px 60px rgba(0,0,0,0.3)', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ textAlign:'center', marginBottom:18 }}>
              <div style={{ fontSize:34 }}>🧾</div>
              <h2 style={{ margin:'8px 0 4px', fontSize:21, fontWeight:900 }}>Confirmar Pago</h2>
            </div>
            <div style={{ background:'#f0fdf4', border:'2px solid #bbf7d0', borderRadius:12, padding:'10px 14px', marginBottom:14 }}>
              <p style={{ margin:'0 0 4px', fontSize:10, fontWeight:800, color:'#166534' }}>CLIENTE</p>
              <p style={{ margin:0, fontWeight:800, fontSize:14 }}>{customer.nombre} {customer.apellido}</p>
              <p style={{ margin:'2px 0 0', fontSize:13 }}>📱 {customer.whatsapp} · 🕐 {customer.hora}</p>
            </div>
            <div style={{ borderTop:'2px dashed #e2e8f0', borderBottom:'2px dashed #e2e8f0', padding:'14px 0', marginBottom:14 }}>
              {renderReceiptItems(buildItems())}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:14 }}>
              <span style={{ color:'#64748b' }}>Consumo:</span>
              <span style={{ fontWeight:700 }}>{consumo==='local'?'🍽️ En el local':'📦 Para llevar'}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:20, fontWeight:900, marginBottom:22, color:'#f97316' }}>
              <span>TOTAL</span><span>{fmtCur(cartTotal)}</span>
            </div>
            <p style={{ fontSize:14, fontWeight:700, marginBottom:12, textAlign:'center' }}>¿Cómo deseas pagar?</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:10 }}>
              <button onClick={()=>handlePay('efectivo')} disabled={submitting} style={{ padding:'18px 8px', borderRadius:14, border:'2px solid #22c55e', background:'#f0fdf4', color:'#166534', fontWeight:800, cursor:'pointer', fontSize:16, display:'flex', flexDirection:'column', alignItems:'center', gap:6, opacity:submitting?0.6:1 }}>
                💵<span>Efectivo</span>
              </button>
              <button
                onClick={()=>restaurante?.qr_url ? handlePay('qr') : null}
                disabled={submitting || !restaurante?.qr_url}
                title={!restaurante?.qr_url ? 'El restaurante aún no ha configurado su QR de pago' : 'Pagar con QR'}
                style={{ padding:'18px 8px', borderRadius:14, border:`2px solid ${restaurante?.qr_url?'#3b82f6':'#e2e8f0'}`, background:restaurante?.qr_url?'#eff6ff':'#f8fafc', color:restaurante?.qr_url?'#1e40af':'#94a3b8', fontWeight:800, cursor:restaurante?.qr_url?'pointer':'not-allowed', fontSize:16, display:'flex', flexDirection:'column', alignItems:'center', gap:6, opacity:submitting?0.6:1 }}>
                📱<span>Pago QR</span>
                {!restaurante?.qr_url && <span style={{ fontSize:10, fontWeight:600, color:'#94a3b8' }}>No disponible</span>}
              </button>
            </div>
            <button onClick={()=>setStep('datos')} style={{ width:'100%', padding:12, borderRadius:12, border:'none', background:'#f1f5f9', color:'#64748b', cursor:'pointer', fontWeight:600 }}>← Volver</button>
          </div>
        </div>
      )}

      {/* DONE MODAL */}
      {step==='done' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding: isMobile ? 8 : 16 }}>
          <div style={{ background:'#fff', borderRadius:24, padding: isMobile ? 24 : 36, maxWidth:420, width:'100%', textAlign:'center', boxShadow:'0 25px 60px rgba(0,0,0,0.3)', maxHeight:'90vh', overflowY:'auto' }}>
            {payMethod==='qr' ? (
              <>
                <div style={{ fontSize:48, marginBottom:8 }}>📱</div>
                <h2 style={{ margin:'0 0 6px', fontWeight:900, fontSize:22 }}>¡Escanea el QR para pagar!</h2>
                <p style={{ color:'#64748b', fontSize:13, marginBottom:20 }}>
                  Pedido <strong>#{orderId}</strong> · Total: <strong style={{ color:'#f97316' }}>{fmtCur(finalTotal)}</strong>
                </p>

                {restaurante?.qr_url ? (
                  <div style={{ marginBottom:20 }}>
                    <div style={{ background:'#f8fafc', border:'2px solid #e2e8f0', borderRadius:16, padding:16, display:'inline-block', marginBottom:12 }}>
                      <img src={restaurante.qr_url} alt="QR de pago" style={{ width: isMobile ? 180 : 220, height: isMobile ? 180 : 220, objectFit:'contain', borderRadius:8, display:'block' }} />
                    </div>
                    <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                      <a href={restaurante.qr_url} download={`QR-Pago-${restaurante?.nombre ?? 'restaurante'}.png`} target="_blank" rel="noreferrer" style={{ padding:'10px 20px', borderRadius:12, background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', color:'#fff', fontWeight:800, fontSize:14, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6 }}>
                        Descargar QR
                      </a>
                      {navigator.share && (
                        <button onClick={async()=>{try{const res=await fetch(restaurante!.qr_url!);const blob=await res.blob();const file=new File([blob],'QR-Pago.png',{type:blob.type});await navigator.share({title:'QR de Pago',files:[file]})}catch{}}} style={{ padding:'10px 20px', borderRadius:12, background:'#f1f5f9', color:'#374151', fontWeight:800, fontSize:14, border:'none', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 }}>
                          Compartir
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize:12, color:'#94a3b8', marginTop:12 }}>Descarga el QR y realiza la transferencia por el monto exacto</p>
                  </div>
                ) : (
                  <div style={{ background:'#fef3c7', borderRadius:12, padding:16, marginBottom:20, fontSize:13, color:'#92400e' }}>
                    El restaurante aún no ha subido su QR de pago. Consulta al local.
                  </div>
                )}

                <div style={{ background:'#fff7ed', border:'1.5px solid #fed7aa', borderRadius:12, padding:'12px 14px', marginBottom:20, fontSize:13, textAlign:'left' }}>
                  <div style={{ fontWeight:700, color:'#9a3412', marginBottom:6 }}>Instrucciones de pago:</div>
                  <div style={{ color:'#64748b', marginBottom:4 }}>1. Escanea el QR con tu app bancaria</div>
                  <div style={{ color:'#64748b', marginBottom:4 }}>2. Transfiere exactamente <strong style={{ color:'#f97316' }}>{fmtCur(finalTotal)}</strong></div>
                  <div style={{ color:'#64748b' }}>3. Guarda el comprobante</div>
                </div>

                <button onClick={()=>setStep('menu')} style={{ width:'100%', padding:14, borderRadius:14, border:'none', background:'linear-gradient(135deg,#f97316,#ef4444)', color:'#fff', fontWeight:900, fontSize:16, cursor:'pointer' }}>
                  ¡Listo, ya pagué!
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize:64, marginBottom:14 }}>✅</div>
                <h2 style={{ margin:'0 0 8px', fontWeight:900, fontSize:22 }}>¡Reserva Confirmada!</h2>
                <p style={{ color:'#64748b', fontSize:14, marginBottom:22, lineHeight:1.6 }}>
                  Pedido <strong>#{orderId}</strong> registrado.<br/>
                  {consumo==='local'?'Te esperamos en el local 🍽️':'Pasarás a recogerlo 📦'}<br/>
                  <strong>Paga en efectivo al recoger.</strong>
                </p>
                <button onClick={()=>setStep('menu')} style={{ width:'100%', padding:14, borderRadius:14, border:'none', background:'linear-gradient(135deg,#f97316,#ef4444)', color:'#fff', fontWeight:900, fontSize:16, cursor:'pointer' }}>
                  ¡Listo!
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <footer style={{ marginTop:48, background:'linear-gradient(135deg,#9a3412,#c2410c)', padding:'18px 24px', textAlign:'center' }}>
        <p style={{ margin:0, fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.9)' }}>© 2026 <strong>SSH Soluciones Bolivia</strong> — DERECHOS RESERVADOS</p>
      </footer>
    </div>
  )
}
