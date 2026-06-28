import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import restauranteRouter  from './routes/restaurante'
import diasRouter         from './routes/dias'
import platosRouter       from './routes/platos'
import pedidosRouter      from './routes/pedidos'
import clientesRouter     from './routes/clientes'
import contabilidadRouter from './routes/contabilidad'
import stockRouter        from './routes/stock'
import publicRouter       from './routes/public'

dotenv.config()

const app  = express()
const PORT = process.env.PORT || 3001

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, curl, mobile)
    if (!origin) return callback(null, true)
    // Always allow localhost
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true)
    }
    // VS Code Dev Tunnels
    if (origin.includes('devtunnels.ms')) return callback(null, true)
    // GitHub Codespaces
    if (origin.includes('app.github.dev')) return callback(null, true)
    // Gitpod
    if (origin.includes('gitpod.io')) return callback(null, true)
    // Custom FRONTEND_URL from .env
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true)
    }
    // In development, allow everything
    if (process.env.NODE_ENV !== 'production') return callback(null, true)
    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}))

// Handle preflight for all routes
app.options('*', cors())
app.use(express.json())

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ ok: true, ts: new Date().toISOString() })
)

// ── Public routes (no auth) ───────────────────────────────────────────────────
app.use('/api/public', publicRouter)

// ── Protected routes (require Supabase JWT) ───────────────────────────────────
app.use('/api/restaurante',  restauranteRouter)
app.use('/api/dias',         diasRouter)
app.use('/api/platos',       platosRouter)
app.use('/api/pedidos',      pedidosRouter)
app.use('/api/clientes',     clientesRouter)
app.use('/api/contabilidad', contabilidadRouter)
app.use('/api/stock',        stockRouter)

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }))

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Backend SaaS corriendo en http://localhost:${PORT}`)
  console.log(`   Supabase: ${process.env.SUPABASE_URL}`)
  console.log(`   Frontend: ${process.env.FRONTEND_URL}`)
})
