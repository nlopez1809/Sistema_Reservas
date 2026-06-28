import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

export default function LandingPage() {
  const navigate = useNavigate()
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  return (
    <div style={{ minHeight:'100vh', fontFamily:font, background:'#fff' }}>
      {/* Nav */}
      <nav style={{ background:'#fff', borderBottom:'1px solid #e5e7eb', padding: isMobile ? '0 16px' : '0 32px', display:'flex', alignItems:'center', justifyContent:'space-between', height:60, position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontWeight:700, fontSize: isMobile ? 17 : 20, color:'#1f2937' }}>AlmuerzApp</span>
        </div>
        <div style={{ display:'flex', gap: isMobile ? 8 : 12 }}>
          <button onClick={()=>navigate('/login')} style={{ padding: isMobile ? '7px 14px' : '8px 20px', borderRadius:8, border:'1px solid #d1d5db', background:'#fff', color:'#374151', fontWeight:600, cursor:'pointer', fontSize: isMobile ? 13 : 14, fontFamily:font }}>Iniciar Sesión</button>
          {!isMobile && <button onClick={()=>navigate('/register')} style={{ padding:'8px 20px', borderRadius:8, border:'none', background:'#e91e63', color:'#fff', fontWeight:600, cursor:'pointer', fontSize:14, fontFamily:font }}>Registrar Restaurante</button>}
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background:'#f9fafb', padding: isMobile ? '48px 20px' : '80px 32px', textAlign:'center' }}>
        <h1 style={{ fontSize: isMobile ? 28 : 48, fontWeight:800, margin:'0 0 16px', color:'#1f2937', letterSpacing:-0.5, lineHeight:1.2 }}>Digitaliza tu Pensión o Restaurante</h1>
        <p style={{ fontSize: isMobile ? 15 : 18, color:'#4b5563', margin:'0 0 40px', maxWidth:560, marginLeft:'auto', marginRight:'auto', lineHeight:1.6 }}>
          Sistema de reservas de almuerzos con menú semanal, control de stock, pagos y contabilidad. Listo para usar.
        </p>
        <button onClick={()=>navigate('/register')} style={{ padding: isMobile ? '14px 32px' : '14px 40px', fontSize: isMobile ? 15 : 16, fontWeight:600, borderRadius:8, border:'none', background:'#e91e63', color:'#fff', cursor:'pointer', width: isMobile ? '100%' : 'auto', maxWidth:400, fontFamily:font }}>
          Empezar Gratis
        </button>
      </div>

      {/* Features */}
      <div style={{ padding: isMobile ? '40px 16px' : '64px 32px', maxWidth:1000, margin:'0 auto' }}>
        <h2 style={{ textAlign:'center', fontSize: isMobile ? 22 : 28, fontWeight:700, marginBottom: isMobile ? 28 : 48, color:'#1f2937' }}>Todo lo que necesitas en un solo lugar</h2>
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: isMobile ? 12 : 20 }}>
          {[
            { title:'Menú Semanal', desc:'Configura sopas, segundos y extras por día. Con precios y stock en tiempo real.' },
            { title:'Reservas Online', desc:'Tus clientes eligen su almuerzo completo, combinaciones personalizadas y hora de recojo.' },
            { title:'Contabilidad', desc:'Reportes diarios, semanales y mensuales. Descarga CSV en un clic.' },
            { title:'Base de Clientes', desc:'Historial automático de pedidos por cliente identificado por WhatsApp.' },
            { title:'Pago Efectivo o QR', desc:'El cliente elige cómo pagar al confirmar su reserva.' },
            { title:'Tu propio link', desc:'Cada restaurante tiene su página pública para compartir con tus clientes.' },
          ].map((f,i) => (
            <div key={i} style={{ background:'#fff', borderRadius:10, padding: isMobile ? 16 : 24, border:'1px solid #e5e7eb' }}>
              <h3 style={{ fontSize:15, fontWeight:700, marginBottom:6, color:'#1f2937', marginTop:0 }}>{f.title}</h3>
              <p style={{ fontSize:14, color:'#6b7280', lineHeight:1.5, margin:0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ background:'#f9fafb', padding: isMobile ? '36px 20px' : '48px 32px', textAlign:'center', borderTop:'1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: isMobile ? 20 : 24, fontWeight:700, marginBottom:12, color:'#1f2937' }}>¿Listo para empezar?</h3>
        <p style={{ color:'#6b7280', marginBottom:24, fontSize: isMobile ? 14 : 15 }}>Crea tu restaurante en menos de 2 minutos.</p>
        <button onClick={()=>navigate('/register')} style={{ padding:'14px 36px', fontSize:15, fontWeight:600, borderRadius:8, border:'none', background:'#e91e63', color:'#fff', cursor:'pointer', width: isMobile ? '100%' : 'auto', maxWidth:400, fontFamily:font }}>
          Registrar mi Restaurante Gratis
        </button>
      </div>

      <footer style={{ padding:'18px 24px', textAlign:'center', borderTop:'1px solid #e5e7eb', background:'#fff' }}>
        <p style={{ margin:0, fontSize:12, color:'#9ca3af' }}>© 2026 SSH Soluciones Bolivia — Derechos reservados</p>
      </footer>
    </div>
  )
}
