import { Router, Response } from 'express'
import { supabase } from '../supabase'
import { requireRestaurante, AuthRequest } from '../middleware/auth'

const router = Router()

// POST /api/stock/reset — manual reset of all platos to stock_inicial
router.post('/reset', requireRestaurante, async (req: AuthRequest, res: Response) => {
  // Try the RPC function first
  const { data: rpcData, error: rpcErr } = await supabase.rpc('reset_stock_restaurante', {
    p_restaurante_id: req.restauranteId
  })

  if (!rpcErr) {
    return res.json({ ok: true, updated: rpcData })
  }

  // Fallback: fetch platos then update each to their stock_inicial
  const { data: platos, error: fetchErr } = await supabase
    .from('platos')
    .select('id, stock_inicial')
    .eq('restaurante_id', req.restauranteId)
    .eq('activo', true)

  if (fetchErr) return res.status(500).json({ error: fetchErr.message })

  const updates = (platos || []).map(p =>
    supabase.from('platos').update({ stock: p.stock_inicial }).eq('id', p.id)
  )
  await Promise.all(updates)

  res.json({ ok: true, updated: platos?.length ?? 0 })
})

// GET /api/stock — stock summary for admin panel
router.get('/', requireRestaurante, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabase
    .from('platos')
    .select('id, nombre, categoria, emoji, stock, stock_inicial, dia_id, dias(nombre)')
    .eq('restaurante_id', req.restauranteId)
    .eq('activo', true)
    .order('dia_id')
    .order('categoria')

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// PATCH /api/stock/:id — manually set stock for one plato
router.patch('/:id', requireRestaurante, async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const { stock } = req.body

  if (stock === undefined || Number(stock) < 0) {
    return res.status(400).json({ error: 'Stock debe ser un número >= 0' })
  }

  const { data, error } = await supabase
    .from('platos')
    .update({ stock: Number(stock) })
    .eq('id', id)
    .eq('restaurante_id', req.restauranteId)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

export default router
