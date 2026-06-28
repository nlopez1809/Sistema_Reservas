import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { supabase } from '../supabase'

const pedidoSchema = z.object({
  codigo:      z.string().min(1).max(20),
  nombre:      z.string().min(1).max(100),
  apellido:    z.string().max(100),
  whatsapp:    z.string().regex(/^\d{7,15}$/, 'Número de WhatsApp inválido'),
  hora_recojo: z.string().max(10),
  consumo:     z.enum(['local', 'llevar']),
  metodo_pago: z.enum(['efectivo', 'qr']),
  total:       z.number().min(0),
  dia_nombre:  z.string().min(1).max(20),
  items: z.array(z.object({
    nombre:     z.string(),
    precio:     z.number().min(0),
    cantidad:   z.number().min(1),
    tipo_linea: z.string(),
  })).min(1),
})

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

  const parsed = pedidoSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Datos inválidos',
      details: parsed.error.flatten().fieldErrors,
    })
  }

  const {
    codigo, nombre, apellido, whatsapp, hora_recojo,
    consumo, metodo_pago, dia_nombre, items
  } = parsed.data

  // Server-side total recalculation (never trust client-sent total)
  const total = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0)

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

// POST /api/public/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email requerido' })

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/reset-password`
  })

  // Always return success to prevent email enumeration
  res.json({ message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña.' })
})

// GET /api/public/:slug/pedido/:codigo — customer checks their order status
router.get('/:slug/pedido/:codigo', async (req: Request, res: Response) => {
  const { slug, codigo } = req.params
  const rest = await getRestBySlug(slug)
  if (!rest) return res.status(404).json({ error: 'Restaurante no encontrado' })

  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      codigo, estado, hora_recojo, consumo, metodo_pago, total, creado_en,
      detalle:pedido_detalle(nombre, precio, cantidad, tipo_linea)
    `)
    .eq('restaurante_id', rest.id)
    .eq('codigo', codigo)
    .single()

  if (error) return res.status(404).json({ error: 'Pedido no encontrado' })
  res.json(data)
})

// GET /api/public/:slug/historial/:whatsapp — customer order history
router.get('/:slug/historial/:whatsapp', async (req: Request, res: Response) => {
  const { slug, whatsapp } = req.params
  const rest = await getRestBySlug(slug)
  if (!rest) return res.status(404).json({ error: 'Restaurante no encontrado' })

  const { data: cliente } = await supabase
    .from('clientes')
    .select('id')
    .eq('restaurante_id', rest.id)
    .eq('whatsapp', whatsapp)
    .single()

  if (!cliente) return res.json([])

  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      codigo, estado, total, creado_en, hora_recojo, consumo,
      detalle:pedido_detalle(nombre, precio, cantidad)
    `)
    .eq('restaurante_id', rest.id)
    .eq('cliente_id', cliente.id)
    .order('creado_en', { ascending: false })
    .limit(10)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

export default router
