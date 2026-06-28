import { Router, Response } from 'express'
import { supabase } from '../supabase'
import { requireRestaurante, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/dias
router.get('/', requireRestaurante, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabase
    .from('dias')
    .select('*')
    .eq('restaurante_id', req.restauranteId)
    .order('orden')

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// PATCH /api/dias/:id
router.patch('/:id', requireRestaurante, async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const { habilitado, mensaje_deshabilitado } = req.body

  const updateData: Record<string, any> = { habilitado }
  if (typeof mensaje_deshabilitado === 'string') {
    updateData.mensaje_deshabilitado = mensaje_deshabilitado
  }
  if (habilitado) {
    updateData.mensaje_deshabilitado = null
  }

  const { data, error } = await supabase
    .from('dias')
    .update(updateData)
    .eq('id', id)
    .eq('restaurante_id', req.restauranteId) // ensure ownership
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

export default router
