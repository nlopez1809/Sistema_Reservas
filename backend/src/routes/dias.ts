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
  const { habilitado } = req.body

  const { data, error } = await supabase
    .from('dias')
    .update({ habilitado })
    .eq('id', id)
    .eq('restaurante_id', req.restauranteId) // ensure ownership
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

export default router
