import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
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

// ── Security ─────────────────────────────────────────────────────────────────
app.use(helmet())

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta de nuevo más tarde.' },
})
app.use(generalLimiter)

const publicRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta de nuevo más tarde.' },
})

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
app.use('/api/public', publicRateLimiter, publicRouter)

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

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Error interno del servidor' })
})

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Backend SaaS corriendo en http://localhost:${PORT}`)
  console.log(`   Supabase: ${process.env.SUPABASE_URL}`)
  console.log(`   Frontend: ${process.env.FRONTEND_URL}`)
})
