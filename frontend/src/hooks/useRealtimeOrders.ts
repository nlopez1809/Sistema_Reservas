import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Pedido } from '@/types'

interface Options {
  restauranteId: string
  onNewOrder: (pedido: Pedido) => void
}

export function useRealtimeOrders({ restauranteId, onNewOrder }: Options) {
  const onNewOrderRef = useRef(onNewOrder)
  useEffect(() => { onNewOrderRef.current = onNewOrder }, [onNewOrder])

  useEffect(() => {
    if (!restauranteId) return

    const channel = supabase
      .channel(`pedidos:${restauranteId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pedidos',
          filter: `restaurante_id=eq.${restauranteId}`,
        },
        async (payload) => {
          // Fetch full pedido with client + day info
          const { data } = await supabase
            .from('pedidos')
            .select('*, cliente:clientes(nombre,apellido,whatsapp), dia:dias(nombre)')
            .eq('id', payload.new.id)
            .single()

          if (data) onNewOrderRef.current(data as Pedido)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [restauranteId])
}

// Generate a short beep sound via Web Audio API (no external file needed)
export function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const sequence = [
      { freq: 880, start: 0,    dur: 0.12 },
      { freq: 1100, start: 0.14, dur: 0.12 },
      { freq: 1320, start: 0.28, dur: 0.2  },
    ]
    sequence.forEach(({ freq, start, dur }) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0, ctx.currentTime + start)
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + start + 0.01)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + dur + 0.05)
    })
  } catch { /* silently fail if audio not available */ }
}

// Request browser notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

// Show a browser push notification
export function showBrowserNotification(title: string, body: string) {
  if (Notification.permission !== 'granted') return
  const n = new Notification(title, {
    body,
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍜</text></svg>",
    tag: 'nuevo-pedido',
  })
  setTimeout(() => n.close(), 6000)
}
