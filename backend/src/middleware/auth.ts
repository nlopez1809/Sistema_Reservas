import { Request, Response, NextFunction } from 'express'
import { supabase } from '../supabase'

export interface AuthRequest extends Request {
  userId?: string
  restauranteId?: string
  restaurante?: any
}

// Full auth: requires valid JWT + an existing restaurante
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación requerido' })
  }

  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }

  req.userId = user.id

  // Get perfil (restaurante_id may be null for new users)
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id, rol')
    .eq('id', user.id)
    .single()

  if (perfil?.restaurante_id) {
    const { data: restaurante } = await supabase
      .from('restaurantes')
      .select('*')
      .eq('id', perfil.restaurante_id)
      .single()

    req.restauranteId = perfil.restaurante_id
    req.restaurante = restaurante
  }

  next()
}

// Auth for routes that REQUIRE a restaurante to exist
export async function requireRestaurante(req: AuthRequest, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    if (!req.restauranteId) {
      return res.status(403).json({ error: 'No tienes un restaurante configurado' })
    }
    next()
  })
}
