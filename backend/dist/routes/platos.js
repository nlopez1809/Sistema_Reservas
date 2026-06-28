"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../supabase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/platos/menu — grouped menu for admin
router.get('/menu', auth_1.requireRestaurante, async (req, res) => {
    const { data: dias } = await supabase_1.supabase
        .from('dias')
        .select('*')
        .eq('restaurante_id', req.restauranteId)
        .eq('habilitado', true)
        .order('orden');
    const { data: platos } = await supabase_1.supabase
        .from('platos')
        .select('*')
        .eq('restaurante_id', req.restauranteId)
        .eq('activo', true)
        .order('id');
    const menu = (dias || []).map((dia) => {
        const del_dia = (platos || []).filter((p) => p.dia_id === dia.id);
        return {
            dia,
            sopas: del_dia.filter((p) => p.categoria === 'sopa'),
            segundos: del_dia.filter((p) => p.categoria === 'segundo'),
            extra: del_dia.find((p) => p.categoria === 'extra') || null,
        };
    });
    res.json(menu);
});
// GET /api/platos — all platos for admin
router.get('/', auth_1.requireRestaurante, async (req, res) => {
    const { data, error } = await supabase_1.supabase
        .from('platos')
        .select('*')
        .eq('restaurante_id', req.restauranteId)
        .order('dia_id').order('categoria');
    if (error)
        return res.status(500).json({ error: error.message });
    res.json(data);
});
// POST /api/platos
router.post('/', auth_1.requireRestaurante, async (req, res) => {
    const { dia_id, categoria, nombre, descripcion, precio, emoji, stock, stock_inicial } = req.body;
    const { data, error } = await supabase_1.supabase
        .from('platos')
        .insert({ restaurante_id: req.restauranteId, dia_id, categoria, nombre, descripcion, precio, emoji, stock, stock_inicial })
        .select()
        .single();
    if (error)
        return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});
// PUT /api/platos/:id
router.put('/:id', auth_1.requireRestaurante, async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase_1.supabase
        .from('platos')
        .update(req.body)
        .eq('id', id)
        .eq('restaurante_id', req.restauranteId)
        .select()
        .single();
    if (error)
        return res.status(500).json({ error: error.message });
    res.json(data);
});
// DELETE /api/platos/:id — soft delete
router.delete('/:id', auth_1.requireRestaurante, async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase_1.supabase
        .from('platos')
        .update({ activo: false })
        .eq('id', id)
        .eq('restaurante_id', req.restauranteId);
    if (error)
        return res.status(500).json({ error: error.message });
    res.json({ ok: true });
});
exports.default = router;
