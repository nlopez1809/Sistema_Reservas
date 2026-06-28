"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../supabase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/dias
router.get('/', auth_1.requireRestaurante, async (req, res) => {
    const { data, error } = await supabase_1.supabase
        .from('dias')
        .select('*')
        .eq('restaurante_id', req.restauranteId)
        .order('orden');
    if (error)
        return res.status(500).json({ error: error.message });
    res.json(data);
});
// PATCH /api/dias/:id
router.patch('/:id', auth_1.requireRestaurante, async (req, res) => {
    const { id } = req.params;
    const { habilitado } = req.body;
    const { data, error } = await supabase_1.supabase
        .from('dias')
        .update({ habilitado })
        .eq('id', id)
        .eq('restaurante_id', req.restauranteId) // ensure ownership
        .select()
        .single();
    if (error)
        return res.status(500).json({ error: error.message });
    res.json(data);
});
exports.default = router;
