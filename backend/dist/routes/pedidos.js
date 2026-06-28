"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../supabase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// POST /api/pedidos — admin view: list all pedidos for this restaurante
router.get('/', auth_1.requireRestaurante, async (req, res) => {
    const { data, error } = await supabase_1.supabase
        .from('pedidos')
        .select(`
      *,
      cliente:clientes(nombre, apellido, whatsapp),
      dia:dias(nombre)
    `)
        .eq('restaurante_id', req.restauranteId)
        .order('creado_en', { ascending: false });
    if (error)
        return res.status(500).json({ error: error.message });
    res.json(data);
});
// GET /api/pedidos/:id
router.get('/:id', auth_1.requireRestaurante, async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase_1.supabase
        .from('pedidos')
        .select(`
      *,
      cliente:clientes(nombre, apellido, whatsapp),
      dia:dias(nombre),
      detalle:pedido_detalle(*)
    `)
        .eq('id', id)
        .eq('restaurante_id', req.restauranteId)
        .single();
    if (error)
        return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(data);
});
exports.default = router;
