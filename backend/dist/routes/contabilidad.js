"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../supabase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/diaria', auth_1.requireRestaurante, async (req, res) => {
    const { data, error } = await supabase_1.supabase
        .from('v_contabilidad_diaria')
        .select('*')
        .eq('restaurante_id', req.restauranteId);
    if (error)
        return res.status(500).json({ error: error.message });
    res.json(data);
});
router.get('/semanal', auth_1.requireRestaurante, async (req, res) => {
    const { data, error } = await supabase_1.supabase
        .from('v_contabilidad_semanal')
        .select('*')
        .eq('restaurante_id', req.restauranteId);
    if (error)
        return res.status(500).json({ error: error.message });
    res.json(data);
});
router.get('/mensual', auth_1.requireRestaurante, async (req, res) => {
    const { data, error } = await supabase_1.supabase
        .from('v_contabilidad_mensual')
        .select('*')
        .eq('restaurante_id', req.restauranteId);
    if (error)
        return res.status(500).json({ error: error.message });
    res.json(data);
});
router.get('/top-platos', auth_1.requireRestaurante, async (req, res) => {
    const { data, error } = await supabase_1.supabase
        .from('v_platos_mas_vendidos')
        .select('*')
        .eq('restaurante_id', req.restauranteId)
        .limit(10);
    if (error)
        return res.status(500).json({ error: error.message });
    res.json(data);
});
exports.default = router;
