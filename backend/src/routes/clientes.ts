import { Router, Response } from 'express'
import { supabase } from '../supabase'
import { requireRestaurante, AuthRequest } from '../middleware/auth'

const router = Router()

router.get('/', requireRestaurante, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('restaurante_id', req.restauranteId)
    .order('total_pedidos', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

export default router
