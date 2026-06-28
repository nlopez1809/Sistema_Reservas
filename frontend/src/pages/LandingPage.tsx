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
        <span style={{ display:'inline-block', background:'#dcfce7', color:'#166534', fontWeight:700, fontSize:13, padding:'4px 14px', borderRadius:99, marginBottom:16 }}>100% Gratis</span>
        <h1 style={{ fontSize: isMobile ? 28 : 48, fontWeight:800, margin:'0 0 16px', color:'#1f2937', letterSpacing:-0.5, lineHeight:1.2 }}>Digitaliza tu Pensión o Restaurante</h1>
        <p style={{ fontSize: isMobile ? 15 : 18, color:'#4b5563', margin:'0 0 40px', maxWidth:560, marginLeft:'auto', marginRight:'auto', lineHeight:1.6 }}>
          Sistema de reservas de almuerzos con menú semanal, control de stock, pagos y contabilidad. Listo para usar.
        </p>
        <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', alignItems:'center', justifyContent:'center' }}>
          <button onClick={()=>navigate('/register')} style={{ padding: isMobile ? '14px 32px' : '14px 40px', fontSize: isMobile ? 15 : 16, fontWeight:600, borderRadius:8, border:'none', background:'#e91e63', color:'#fff', cursor:'pointer', width: isMobile ? '100%' : 'auto', maxWidth:400, fontFamily:font }}>
            Empezar Gratis
          </button>
          <button onClick={()=>navigate('/menu/demo')} style={{ padding: isMobile ? '14px 32px' : '14px 40px', fontSize: isMobile ? 15 : 16, fontWeight:600, borderRadius:8, border:'1px solid #d1d5db', background:'#fff', color:'#374151', cursor:'pointer', width: isMobile ? '100%' : 'auto', maxWidth:400, fontFamily:font, marginTop: isMobile ? 12 : 0, marginLeft: isMobile ? 0 : 12 }}>
            Ver Demo
          </button>
        </div>
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

      {/* Cómo funciona */}
      <div style={{ padding: isMobile ? '40px 16px' : '64px 32px', maxWidth:1000, margin:'0 auto' }}>
        <h2 style={{ textAlign:'center', fontSize: isMobile ? 22 : 28, fontWeight:700, marginBottom: isMobile ? 28 : 48, color:'#1f2937' }}>Cómo funciona</h2>
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: isMobile ? 16 : 24 }}>
          {[
            { step:'1', title:'Regístrate', desc:'Crea tu cuenta y configura tu restaurante en menos de 2 minutos.' },
            { step:'2', title:'Arma tu menú', desc:'Agrega sopas, segundos y extras para cada día de la semana.' },
            { step:'3', title:'Comparte tu link', desc:'Envía tu link público a tus clientes por WhatsApp y recibe reservas.' },
          ].map((s,i) => (
            <div key={i} style={{ textAlign:'center', padding: isMobile ? 20 : 32 }}>
              <div style={{ width:48, height:48, borderRadius:'50%', background:'#fef1f5', color:'#e91e63', fontWeight:800, fontSize:20, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>{s.step}</div>
              <h3 style={{ fontSize:16, fontWeight:700, marginBottom:8, color:'#1f2937', marginTop:0 }}>{s.title}</h3>
              <p style={{ fontSize:14, color:'#6b7280', lineHeight:1.5, margin:0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ background:'#f9fafb', padding: isMobile ? '36px 20px' : '48px 32px', textAlign:'center', borderTop:'1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: isMobile ? 20 : 24, fontWeight:700, marginBottom:12, color:'#1f2937' }}>¿Listo para empezar?</h3>
        <p style={{ color:'#6b7280', marginBottom:24, fontSize: isMobile ? 14 : 15 }}>Crea tu restaurante en menos de 2 minutos. Gratis para siempre.</p>
        <button onClick={()=>navigate('/register')} style={{ padding:'14px 36px', fontSize:15, fontWeight:600, borderRadius:8, border:'none', background:'#e91e63', color:'#fff', cursor:'pointer', width: isMobile ? '100%' : 'auto', maxWidth:400, fontFamily:font }}>
          Registrar mi Restaurante Gratis
        </button>
      </div>

      <footer style={{ padding:'18px 24px', textAlign:'center', borderTop:'1px solid #e5e7eb', background:'#fff' }}>
        <p style={{ margin:0, fontSize:12, color:'#9ca3af' }}>© 2026 SSH Soluciones Bolivia — Derechos reservados</p>
      </footer>

      <a href="https://wa.me/59178900000" target="_blank" rel="noreferrer" style={{ position:'fixed', bottom:24, right:24, width:56, height:56, borderRadius:'50%', background:'#25d366', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(0,0,0,0.15)', zIndex:999, textDecoration:'none' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </a>
    </div>
  )
}
