import { useEffect, useState } from 'react'
import { fmtCur } from '@/lib/utils'
import type { Pedido } from '@/types'

interface Props {
  pedido: Pedido
  onClose: () => void
  onView: () => void
}

export function NotificationToast({ pedido, onClose, onView }: Props) {
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    // Slide in
    requestAnimationFrame(() => setVisible(true))

    // Progress bar countdown (8 seconds)
    const start = Date.now()
    const duration = 8000
    const timer = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(pct)
      if (pct === 0) { clearInterval(timer); handleClose() }
    }, 50)

    return () => clearInterval(timer)
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const cliente = pedido.cliente
  const nombre = cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Cliente'

  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999,
      width: 340, borderRadius: 18, overflow: 'hidden',
      background: '#fff', boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      border: '2px solid #f97316',
      transform: visible ? 'translateX(0)' : 'translateX(120%)',
      transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      {/* Progress bar */}
      <div style={{ height: 4, background: '#f1f5f9' }}>
        <div style={{
          height: '100%', background: 'linear-gradient(90deg,#f97316,#ef4444)',
          width: `${progress}%`, transition: 'width 0.05s linear', borderRadius: 99
        }} />
      </div>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#f97316,#ef4444)',
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24, animation: 'pulse 1s infinite' }}>🔔</span>
          <div>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 15 }}>¡Nuevo Pedido!</div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11 }}>{pedido.dia?.nombre} · {pedido.hora_recojo}</div>
          </div>
        </div>
        <button onClick={handleClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontWeight: 900, fontSize: 14 }}>✕</button>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>{nombre}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              📱 {cliente?.whatsapp || '—'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 900, fontSize: 18, color: '#f97316' }}>{fmtCur(Number(pedido.total))}</div>
            <div style={{ fontSize: 11, color: pedido.consumo === 'local' ? '#1d4ed8' : '#6d28d9', fontWeight: 700 }}>
              {pedido.consumo === 'local' ? '🍽️ En el local' : '📦 Para llevar'}
            </div>
          </div>
        </div>

        {/* Payment badge */}
        <div style={{ marginBottom: 12 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
            background: pedido.metodo_pago === 'efectivo' ? '#f0fdf4' : '#eff6ff',
            color: pedido.metodo_pago === 'efectivo' ? '#166534' : '#1e40af',
          }}>
            {pedido.metodo_pago === 'efectivo' ? '💵 Efectivo' : '📱 QR'} · Código #{pedido.codigo}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { onView(); handleClose() }} style={{
            flex: 1, padding: '9px 0', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg,#f97316,#ef4444)', color: '#fff',
            fontWeight: 800, cursor: 'pointer', fontSize: 13,
          }}>Ver Pedido →</button>
          <button onClick={handleClose} style={{
            padding: '9px 14px', borderRadius: 10, border: 'none',
            background: '#f1f5f9', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: 13,
          }}>OK</button>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }
      `}</style>
    </div>
  )
}

// ── Notification Bell with badge ──────────────────────────────────────────────
interface BellProps {
  count: number
  onClick: () => void
}

export function NotificationBell({ count, onClick }: BellProps) {
  return (
    <button onClick={onClick} style={{
      position: 'relative', background: count > 0 ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.1)',
      border: `2px solid ${count > 0 ? '#f97316' : 'transparent'}`,
      color: '#fff', borderRadius: 10, padding: '6px 10px', cursor: 'pointer',
      fontSize: 18, lineHeight: 1, transition: 'all 0.2s',
      animation: count > 0 ? 'bellShake 0.5s ease' : 'none',
    }}>
      🔔
      {count > 0 && (
        <span style={{
          position: 'absolute', top: -6, right: -6,
          background: '#ef4444', color: '#fff', borderRadius: '50%',
          width: 20, height: 20, fontSize: 11, fontWeight: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid #1e293b',
        }}>{count > 9 ? '9+' : count}</span>
      )}
      <style>{`
        @keyframes bellShake {
          0%,100%{transform:rotate(0)} 20%{transform:rotate(-15deg)} 40%{transform:rotate(15deg)}
          60%{transform:rotate(-10deg)} 80%{transform:rotate(10deg)}
        }
      `}</style>
    </button>
  )
}

// ── Notification History Panel ────────────────────────────────────────────────
interface HistoryProps {
  notifications: Pedido[]
  onClose: () => void
  onViewPedidos: () => void
}

export function NotificationHistory({ notifications, onClose, onViewPedidos }: HistoryProps) {
  if (notifications.length === 0) return null

  return (
    <div style={{
      position: 'fixed', top: 60, right: 16, zIndex: 9998,
      width: 340, background: '#fff', borderRadius: 16,
      boxShadow: '0 8px 40px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 800, fontSize: 14 }}>🔔 Pedidos recientes ({notifications.length})</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onViewPedidos} style={{ fontSize: 11, fontWeight: 700, color: '#f97316', background: 'none', border: 'none', cursor: 'pointer' }}>Ver todos →</button>
          <button onClick={onClose} style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {notifications.slice(0, 8).map((p, i) => (
          <div key={p.id} style={{ padding: '10px 16px', borderBottom: i < notifications.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{p.cliente?.nombre} {p.cliente?.apellido}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{p.dia?.nombre} · {p.hora_recojo} · #{p.codigo}</div>
            </div>
            <div style={{ fontWeight: 900, color: '#f97316', fontSize: 14 }}>{fmtCur(Number(p.total))}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
