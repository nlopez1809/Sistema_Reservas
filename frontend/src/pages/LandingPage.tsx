import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

export default function LandingPage() {
  const navigate = useNavigate()
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  return (
    <div style={{ minHeight:'100vh', fontFamily:'Georgia,serif' }}>
      {/* Nav */}
      <nav style={{ background:'rgba(255,255,255,0.95)', backdropFilter:'blur(10px)', borderBottom:'1px solid #e2e8f0', padding: isMobile ? '0 16px' : '0 32px', display:'flex', alignItems:'center', justifyContent:'space-between', height:64, position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:28 }}>🍜</span>
          <span style={{ fontWeight:900, fontSize: isMobile ? 17 : 20, color:'#9a3412' }}>AlmuerzApp</span>
        </div>
        <div style={{ display:'flex', gap: isMobile ? 8 : 12 }}>
          <button onClick={()=>navigate('/login')} style={{ padding: isMobile ? '7px 12px' : '8px 20px', borderRadius:10, border:'2px solid #f97316', background:'#fff', color:'#f97316', fontWeight:700, cursor:'pointer', fontSize: isMobile ? 12 : 14 }}>Iniciar Sesión</button>
          {!isMobile && <button onClick={()=>navigate('/register')} style={{ padding:'8px 20px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#f97316,#ef4444)', color:'#fff', fontWeight:700, cursor:'pointer' }}>Registrar Restaurante</button>}
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,#9a3412 0%,#c2410c 60%,#ea580c 100%)', padding: isMobile ? '48px 20px' : '80px 32px', textAlign:'center', color:'#fff' }}>
        <h1 style={{ fontSize: isMobile ? 28 : 48, fontWeight:900, margin:'0 0 16px', letterSpacing:-1, lineHeight:1.2 }}>Digitaliza tu Pensión o Restaurante</h1>
        <p style={{ fontSize: isMobile ? 15 : 20, opacity:1, margin:'0 0 40px', maxWidth:560, marginLeft:'auto', marginRight:'auto', lineHeight:1.5 }}>
          Sistema de reservas de almuerzos con menú semanal, control de stock, pagos y contabilidad. Listo para usar.
        </p>
        <button onClick={()=>navigate('/register')} style={{ padding: isMobile ? '14px 32px' : '16px 40px', fontSize: isMobile ? 16 : 18, fontWeight:900, borderRadius:14, border:'none', background:'#fff', color:'#c2410c', cursor:'pointer', boxShadow:'0 4px 20px rgba(0,0,0,0.2)', width: isMobile ? '100%' : 'auto', maxWidth:400 }}>
          Empezar Gratis →
        </button>
      </div>

      {/* Features */}
      <div style={{ padding: isMobile ? '40px 16px' : '64px 32px', maxWidth:1000, margin:'0 auto' }}>
        <h2 style={{ textAlign:'center', fontSize: isMobile ? 22 : 30, fontWeight:900, marginBottom: isMobile ? 28 : 48, color:'#1e293b' }}>Todo lo que necesitas en un solo lugar</h2>
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: isMobile ? 16 : 24 }}>
          {[
            { icon:'📅', title:'Menú Semanal', desc:'Configura sopas, segundos y extras por día. Con emojis, precios y stock en tiempo real.' },
            { icon:'🛒', title:'Reservas Online', desc:'Tus clientes eligen su almuerzo completo, combinaciones personalizadas y hora de recojo.' },
            { icon:'💵', title:'Contabilidad', desc:'Reportes diarios, semanales y mensuales. Descarga CSV en un clic.' },
            { icon:'👥', title:'Base de Clientes', desc:'Historial automático de pedidos por cliente identificado por WhatsApp.' },
            { icon:'📱', title:'Pago Efectivo o QR', desc:'El cliente elige cómo pagar al confirmar su reserva.' },
            { icon:'🔗', title:'Tu propio link', desc:'Cada restaurante tiene su página pública para compartir con tus clientes.' },
          ].map((f,i) => (
            <div key={i} style={{ background:'#fff', borderRadius:16, padding: isMobile ? 20 : 24, boxShadow:'0 1px 8px rgba(0,0,0,0.08)', border:'1px solid #f1f5f9', display:'flex', flexDirection: isMobile ? 'row' as const : 'column' as const, gap: isMobile ? 14 : 0, alignItems: isMobile ? 'center' : 'flex-start' }}>
              <div style={{ fontSize: isMobile ? 28 : 36, marginBottom: isMobile ? 0 : 12, flexShrink:0 }}>{f.icon}</div>
              <div>
                <h3 style={{ fontSize: isMobile ? 15 : 17, fontWeight:800, marginBottom:6, color:'#1e293b', marginTop:0 }}>{f.title}</h3>
                <p style={{ fontSize: isMobile ? 13 : 14, color:'#64748b', lineHeight:1.5, margin:0 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ background:'#fff7ed', padding: isMobile ? '36px 20px' : '48px 32px', textAlign:'center', borderTop:'2px solid #fed7aa' }}>
        <h3 style={{ fontSize: isMobile ? 20 : 24, fontWeight:900, marginBottom:12, color:'#9a3412' }}>¿Listo para empezar?</h3>
        <p style={{ color:'#64748b', marginBottom:24, fontSize: isMobile ? 14 : 15 }}>Crea tu restaurante en menos de 2 minutos.</p>
        <button onClick={()=>navigate('/register')} style={{ padding:'14px 36px', fontSize:16, fontWeight:900, borderRadius:12, border:'none', background:'linear-gradient(135deg,#f97316,#ef4444)', color:'#fff', cursor:'pointer', width: isMobile ? '100%' : 'auto', maxWidth:400 }}>
          Registrar mi Restaurante Gratis
        </button>
      </div>

      <footer style={{ background:'linear-gradient(135deg,#9a3412,#c2410c)', padding:'18px 24px', textAlign:'center' }}>
        <p style={{ margin:0, fontSize:13, color:'rgba(255,255,255,0.85)', fontWeight:700 }}>© 2026 <strong>SSH Soluciones Bolivia</strong> — DERECHOS RESERVADOS</p>
      </footer>
    </div>
  )
}
