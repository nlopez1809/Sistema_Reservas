import { Router, Response } from 'express'
import { supabase } from '../supabase'
import { requireRestaurante, AuthRequest } from '../middleware/auth'

const router = Router()

router.get('/diaria', requireRestaurante, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabase
    .from('v_contabilidad_diaria')
    .select('*')
    .eq('restaurante_id', req.restauranteId)
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.get('/semanal', requireRestaurante, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabase
    .from('v_contabilidad_semanal')
    .select('*')
    .eq('restaurante_id', req.restauranteId)
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.get('/mensual', requireRestaurante, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabase
    .from('v_contabilidad_mensual')
    .select('*')
    .eq('restaurante_id', req.restauranteId)
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.get('/top-platos', requireRestaurante, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabase
    .from('v_platos_mas_vendidos')
    .select('*')
    .eq('restaurante_id', req.restauranteId)
    .limit(10)
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

export default router
