import { Router, Request, Response } from 'express'
import { supabase } from '../supabase'

const router = Router()

// Helper: get restaurante by slug
async function getRestBySlug(slug: string) {
  const { data } = await supabase
    .from('restaurantes')
    .select('*')
    .eq('slug', slug)
    .eq('activo', true)
    .single()
  return data
}

// GET /api/public/:slug/menu
router.get('/:slug/menu', async (req: Request, res: Response) => {
  const { slug } = req.params
  const rest = await getRestBySlug(slug)
  if (!rest) return res.status(404).json({ error: 'Restaurante no encontrado' })

  const { data: dias } = await supabase
    .from('dias')
    .select('*')
    .eq('restaurante_id', rest.id)
    .eq('habilitado', true)
    .order('orden')

  const { data: platos } = await supabase
    .from('platos')
    .select('*')
    .eq('restaurante_id', rest.id)
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

  res.json({ restaurante: rest, menu })
})

// GET /api/public/:slug/dias
router.get('/:slug/dias', async (req: Request, res: Response) => {
  const { slug } = req.params
  const rest = await getRestBySlug(slug)
  if (!rest) return res.status(404).json({ error: 'Restaurante no encontrado' })

  const { data, error } = await supabase
    .from('dias')
    .select('*')
    .eq('restaurante_id', rest.id)
    .order('orden')

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// POST /api/public/:slug/pedidos — public order submission (no auth needed)
router.post('/:slug/pedidos', async (req: Request, res: Response) => {
  const { slug } = req.params
  const rest = await getRestBySlug(slug)
  if (!rest) return res.status(404).json({ error: 'Restaurante no encontrado' })

  const {
    codigo, nombre, apellido, whatsapp, hora_recojo,
    consumo, metodo_pago, total, dia_nombre, items
  } = req.body

  if (!codigo || !nombre || !whatsapp || !items?.length) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' })
  }

  const { data, error } = await supabase.rpc('registrar_pedido', {
    p_restaurante_id: rest.id,
    p_codigo:         codigo,
    p_nombre:         nombre,
    p_apellido:       apellido,
    p_whatsapp:       whatsapp,
    p_hora_recojo:    hora_recojo,
    p_consumo:        consumo,
    p_metodo_pago:    metodo_pago,
    p_total:          total,
    p_dia_nombre:     dia_nombre,
    p_items:          items,
  })

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ id: data, codigo })
})

export default router
