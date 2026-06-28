import { Router, Request, Response } from 'express'
import { supabase } from '../supabase'
import { requireRestaurante, AuthRequest } from '../middleware/auth'

const router = Router()

// POST /api/pedidos — admin view: list all pedidos for this restaurante
router.get('/', requireRestaurante, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      cliente:clientes(nombre, apellido, whatsapp),
      dia:dias(nombre)
    `)
    .eq('restaurante_id', req.restauranteId)
    .order('creado_en', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /api/pedidos/:id
router.get('/:id', requireRestaurante, async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      cliente:clientes(nombre, apellido, whatsapp),
      dia:dias(nombre),
      detalle:pedido_detalle(*)
    `)
    .eq('id', id)
    .eq('restaurante_id', req.restauranteId)
    .single()

  if (error) return res.status(404).json({ error: 'Pedido no encontrado' })
  res.json(data)
})

export default router
