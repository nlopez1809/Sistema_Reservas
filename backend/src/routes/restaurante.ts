import { Router, Response } from 'express'
import { supabase } from '../supabase'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// POST /api/restaurante — create restaurante + setup dias
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { nombre, slug, descripcion, telefono, direccion, ciudad } = req.body

  if (!nombre?.trim() || !slug?.trim()) {
    return res.status(400).json({ error: 'nombre y slug son obligatorios' })
  }

  // Check slug is unique
  const { data: existing } = await supabase
    .from('restaurantes')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existing) return res.status(409).json({ error: 'El slug ya está en uso' })

  // Create restaurante
  const { data: rest, error } = await supabase
    .from('restaurantes')
    .insert({ nombre, slug, descripcion, telefono, direccion, ciudad, owner_id: req.userId })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  // Link perfil to restaurante
  await supabase
    .from('perfiles')
    .update({ restaurante_id: rest.id })
    .eq('id', req.userId)

  // Setup 7 días
  await supabase.rpc('setup_restaurante', { p_restaurante_id: rest.id })

  res.status(201).json({ restaurante: rest })
})

// GET /api/restaurante/me — get current restaurante + perfil
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', req.userId)
    .single()

  if (!perfil) {
    // Perfil doesn't exist yet (trigger may have failed) — create it
    await supabase.from('perfiles').insert({
      id: req.userId, nombre: '', apellido: '', rol: 'admin'
    }).select().single()
    return res.json({ restaurante: null, perfil: null })
  }

  let restaurante = null
  if (perfil.restaurante_id) {
    const { data } = await supabase
      .from('restaurantes')
      .select('*')
      .eq('id', perfil.restaurante_id)
      .single()
    restaurante = data ?? null
  }

  res.json({ restaurante, perfil })
})

// PUT /api/restaurante/me — update restaurante info
router.put('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const { nombre, descripcion, telefono, direccion, ciudad, qr_url, logo_url } = req.body

  const { data, error } = await supabase
    .from('restaurantes')
    .update({ nombre, descripcion, telefono, direccion, ciudad, qr_url, logo_url })
    .eq('id', req.restauranteId)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

export default router
