"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../supabase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// POST /api/stock/reset — manual reset of all platos to stock_inicial
router.post('/reset', auth_1.requireRestaurante, async (req, res) => {
    // Try the RPC function first
    const { data: rpcData, error: rpcErr } = await supabase_1.supabase.rpc('reset_stock_restaurante', {
        p_restaurante_id: req.restauranteId
    });
    if (!rpcErr) {
        return res.json({ ok: true, updated: rpcData });
    }
    // Fallback: fetch platos then update each to their stock_inicial
    const { data: platos, error: fetchErr } = await supabase_1.supabase
        .from('platos')
        .select('id, stock_inicial')
        .eq('restaurante_id', req.restauranteId)
        .eq('activo', true);
    if (fetchErr)
        return res.status(500).json({ error: fetchErr.message });
    const updates = (platos || []).map(p => supabase_1.supabase.from('platos').update({ stock: p.stock_inicial }).eq('id', p.id));
    await Promise.all(updates);
    res.json({ ok: true, updated: platos?.length ?? 0 });
});
// GET /api/stock — stock summary for admin panel
router.get('/', auth_1.requireRestaurante, async (req, res) => {
    const { data, error } = await supabase_1.supabase
        .from('platos')
        .select('id, nombre, categoria, emoji, stock, stock_inicial, dia_id, dias(nombre)')
        .eq('restaurante_id', req.restauranteId)
        .eq('activo', true)
        .order('dia_id')
        .order('categoria');
    if (error)
        return res.status(500).json({ error: error.message });
    res.json(data);
});
// PATCH /api/stock/:id — manually set stock for one plato
router.patch('/:id', auth_1.requireRestaurante, async (req, res) => {
    const { id } = req.params;
    const { stock } = req.body;
    if (stock === undefined || Number(stock) < 0) {
        return res.status(400).json({ error: 'Stock debe ser un número >= 0' });
    }
    const { data, error } = await supabase_1.supabase
        .from('platos')
        .update({ stock: Number(stock) })
        .eq('id', id)
        .eq('restaurante_id', req.restauranteId)
        .select()
        .single();
    if (error)
        return res.status(500).json({ error: error.message });
    res.json(data);
});
exports.default = router;
