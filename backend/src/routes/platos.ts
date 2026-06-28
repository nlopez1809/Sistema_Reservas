import { Router, Response } from 'express'
import { supabase } from '../supabase'
import { requireRestaurante, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/platos/menu — grouped menu for admin
router.get('/menu', requireRestaurante, async (req: AuthRequest, res: Response) => {
  const { data: dias } = await supabase
    .from('dias')
    .select('*')
    .eq('restaurante_id', req.restauranteId)
    .eq('habilitado', true)
    .order('orden')

  const { data: platos } = await supabase
    .from('platos')
    .select('*')
    .eq('restaurante_id', req.restauranteId)
    .eq('activo', true)
    .order('id')

  const menu = (dias || []).map((dia: any) => {
    const del_dia = (platos || []).filter((p: any) => p.dia_id === dia.id)
    return {
      dia,
      sopas:    del_dia.filter((p: any) => p.categoria === 'sopa'),
      segundos: del_dia.filter((p: any) => p.categoria === 'segundo'),
      extra:    del_dia.find((p: any) => p.categoria === 'extra') || null,
    }
  })

  res.json(menu)
})

// GET /api/platos — all platos for admin
router.get('/', requireRestaurante, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabase
    .from('platos')
    .select('*')
    .eq('restaurante_id', req.restauranteId)
    .order('dia_id').order('categoria')

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// POST /api/platos
router.post('/', requireRestaurante, async (req: AuthRequest, res: Response) => {
  const { dia_id, categoria, nombre, descripcion, precio, emoji, stock, stock_inicial } = req.body

  const { data, error } = await supabase
    .from('platos')
    .insert({ restaurante_id: req.restauranteId, dia_id, categoria, nombre, descripcion, precio, emoji, stock, stock_inicial })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// PUT /api/platos/:id
router.put('/:id', requireRestaurante, async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  const { data, error } = await supabase
    .from('platos')
    .update(req.body)
    .eq('id', id)
    .eq('restaurante_id', req.restauranteId)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// DELETE /api/platos/:id — soft delete
router.delete('/:id', requireRestaurante, async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  const { error } = await supabase
    .from('platos')
    .update({ activo: false })
    .eq('id', id)
    .eq('restaurante_id', req.restauranteId)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

export default router
