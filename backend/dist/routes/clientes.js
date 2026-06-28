"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../supabase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.requireRestaurante, async (req, res) => {
    const { data, error } = await supabase_1.supabase
        .from('clientes')
        .select('*')
        .eq('restaurante_id', req.restauranteId)
        .order('total_pedidos', { ascending: false });
    if (error)
        return res.status(500).json({ error: error.message });
    res.json(data);
});
exports.default = router;
