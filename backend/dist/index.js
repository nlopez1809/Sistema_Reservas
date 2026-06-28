"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const restaurante_1 = __importDefault(require("./routes/restaurante"));
const dias_1 = __importDefault(require("./routes/dias"));
const platos_1 = __importDefault(require("./routes/platos"));
const pedidos_1 = __importDefault(require("./routes/pedidos"));
const clientes_1 = __importDefault(require("./routes/clientes"));
const contabilidad_1 = __importDefault(require("./routes/contabilidad"));
const stock_1 = __importDefault(require("./routes/stock"));
const public_1 = __importDefault(require("./routes/public"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// ── Middleware ────────────────────────────────────────────────────────────────
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (Postman, curl, mobile)
        if (!origin)
            return callback(null, true);
        // Always allow localhost
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }
        // VS Code Dev Tunnels
        if (origin.includes('devtunnels.ms'))
            return callback(null, true);
        // GitHub Codespaces
        if (origin.includes('app.github.dev'))
            return callback(null, true);
        // Gitpod
        if (origin.includes('gitpod.io'))
            return callback(null, true);
        // Custom FRONTEND_URL from .env
        if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
            return callback(null, true);
        }
        // In development, allow everything
        if (process.env.NODE_ENV !== 'production')
            return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));
// Handle preflight for all routes
app.options('*', (0, cors_1.default)());
app.use(express_1.default.json());
// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
// ── Public routes (no auth) ───────────────────────────────────────────────────
app.use('/api/public', public_1.default);
// ── Protected routes (require Supabase JWT) ───────────────────────────────────
app.use('/api/restaurante', restaurante_1.default);
app.use('/api/dias', dias_1.default);
app.use('/api/platos', platos_1.default);
app.use('/api/pedidos', pedidos_1.default);
app.use('/api/clientes', clientes_1.default);
app.use('/api/contabilidad', contabilidad_1.default);
app.use('/api/stock', stock_1.default);
// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Backend SaaS corriendo en http://localhost:${PORT}`);
    console.log(`   Supabase: ${process.env.SUPABASE_URL}`);
    console.log(`   Frontend: ${process.env.FRONTEND_URL}`);
});
