"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../supabase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// POST /api/restaurante — create restaurante + setup dias
router.post('/', auth_1.requireAuth, async (req, res) => {
    const { nombre, slug, descripcion, telefono, direccion, ciudad } = req.body;
    if (!nombre?.trim() || !slug?.trim()) {
        return res.status(400).json({ error: 'nombre y slug son obligatorios' });
    }
    // Check slug is unique
    const { data: existing } = await supabase_1.supabase
        .from('restaurantes')
        .select('id')
        .eq('slug', slug)
        .single();
    if (existing)
        return res.status(409).json({ error: 'El slug ya está en uso' });
    // Create restaurante
    const { data: rest, error } = await supabase_1.supabase
        .from('restaurantes')
        .insert({ nombre, slug, descripcion, telefono, direccion, ciudad, owner_id: req.userId })
        .select()
        .single();
    if (error)
        return res.status(500).json({ error: error.message });
    // Link perfil to restaurante
    await supabase_1.supabase
        .from('perfiles')
        .update({ restaurante_id: rest.id })
        .eq('id', req.userId);
    // Setup 7 días
    await supabase_1.supabase.rpc('setup_restaurante', { p_restaurante_id: rest.id });
    res.status(201).json({ restaurante: rest });
});
// GET /api/restaurante/me — get current restaurante + perfil
router.get('/me', auth_1.requireAuth, async (req, res) => {
    const { data: perfil } = await supabase_1.supabase
        .from('perfiles')
        .select('*')
        .eq('id', req.userId)
        .single();
    if (!perfil) {
        // Perfil doesn't exist yet (trigger may have failed) — create it
        await supabase_1.supabase.from('perfiles').insert({
            id: req.userId, nombre: '', apellido: '', rol: 'admin'
        }).select().single();
        return res.json({ restaurante: null, perfil: null });
    }
    let restaurante = null;
    if (perfil.restaurante_id) {
        const { data } = await supabase_1.supabase
            .from('restaurantes')
            .select('*')
            .eq('id', perfil.restaurante_id)
            .single();
        restaurante = data ?? null;
    }
    res.json({ restaurante, perfil });
});
// PUT /api/restaurante/me — update restaurante info
router.put('/me', auth_1.requireAuth, async (req, res) => {
    const { nombre, descripcion, telefono, direccion, ciudad, qr_url } = req.body;
    const { data, error } = await supabase_1.supabase
        .from('restaurantes')
        .update({ nombre, descripcion, telefono, direccion, ciudad, qr_url })
        .eq('id', req.restauranteId)
        .select()
        .single();
    if (error)
        return res.status(500).json({ error: error.message });
    res.json(data);
});
exports.default = router;
