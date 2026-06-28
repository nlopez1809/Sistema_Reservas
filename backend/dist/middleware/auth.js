"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRestaurante = requireRestaurante;
const supabase_1 = require("../supabase");
// Full auth: requires valid JWT + an existing restaurante
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de autenticación requerido' });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase_1.supabase.auth.getUser(token);
    if (error || !user) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
    req.userId = user.id;
    // Get perfil (restaurante_id may be null for new users)
    const { data: perfil } = await supabase_1.supabase
        .from('perfiles')
        .select('restaurante_id, rol')
        .eq('id', user.id)
        .single();
    if (perfil?.restaurante_id) {
        const { data: restaurante } = await supabase_1.supabase
            .from('restaurantes')
            .select('*')
            .eq('id', perfil.restaurante_id)
            .single();
        req.restauranteId = perfil.restaurante_id;
        req.restaurante = restaurante;
    }
    next();
}
// Auth for routes that REQUIRE a restaurante to exist
async function requireRestaurante(req, res, next) {
    await requireAuth(req, res, () => {
        if (!req.restauranteId) {
            return res.status(403).json({ error: 'No tienes un restaurante configurado' });
        }
        next();
    });
}
