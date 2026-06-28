import axios from 'axios'
import { supabase } from './supabase'

// If VITE_API_URL is set (e.g. https://abc-3001.app.github.dev), append /api
// Otherwise fall back to Vite proxy path /api
const rawUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') // remove trailing slash
const BASE = rawUrl ? `${rawUrl}/api` : '/api'

const api = axios.create({
  baseURL: BASE,
  withCredentials: false,
})

// Attach Supabase JWT to every request automatically
api.interceptors.request.use(async config => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Better error messages
api.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.error || err.message || 'Error de conexión'
    return Promise.reject(new Error(msg))
  }
)

// ── Auth (via Supabase directly) ─────────────────────────────────────────────
export const authSignUp = (email: string, password: string, nombre: string, apellido: string) =>
  supabase.auth.signUp({ email, password, options: { data: { nombre, apellido } } })

export const authSignIn = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password })

export const authSignOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

// ── Restaurante ──────────────────────────────────────────────────────────────
export const createRestaurante = (data: object) =>
  api.post('/restaurante', data).then(r => r.data)

export const getMyRestaurante = () =>
  api.get('/restaurante/me').then(r => r.data)

export const updateRestaurante = (data: object) =>
  api.put('/restaurante/me', data).then(r => r.data)

// ── Días ─────────────────────────────────────────────────────────────────────
export const getDias = () => api.get('/dias').then(r => r.data)
export const getDiasBySlug = (slug: string) =>
  api.get(`/public/${slug}/dias`).then(r => r.data)
export const toggleDia = (id: number, habilitado: boolean, mensaje_deshabilitado?: string) =>
  api.patch(`/dias/${id}`, { habilitado, mensaje_deshabilitado }).then(r => r.data)

// ── Platos ───────────────────────────────────────────────────────────────────
export const getMenu = () => api.get('/platos/menu').then(r => r.data)
export const getMenuBySlug = (slug: string) =>
  api.get(`/public/${slug}/menu`).then(r => r.data)
export const getPlatos = () => api.get('/platos').then(r => r.data)
export const createPlato = (data: object) => api.post('/platos', data).then(r => r.data)
export const updatePlato = (id: number, data: object) =>
  api.put(`/platos/${id}`, data).then(r => r.data)
export const deletePlato = (id: number) => api.delete(`/platos/${id}`).then(r => r.data)

// ── Pedidos ──────────────────────────────────────────────────────────────────
export const createPedido = (payload: object, slug: string) =>
  api.post(`/public/${slug}/pedidos`, payload).then(r => r.data)
export const getPedidos = () => api.get('/pedidos').then(r => r.data)

// ── Clientes ─────────────────────────────────────────────────────────────────
export const getClientes = () => api.get('/clientes').then(r => r.data)

// ── Stock ─────────────────────────────────────────────────────────────────────
export const resetStock     = () => api.post('/stock/reset').then(r => r.data)
export const getStock       = () => api.get('/stock').then(r => r.data)
export const updateStock    = (id: number, stock: number) =>
  api.patch(`/stock/${id}`, { stock }).then(r => r.data)

// ── Contabilidad ─────────────────────────────────────────────────────────────
export const getContDiaria  = () => api.get('/contabilidad/diaria').then(r => r.data)
export const getContSemanal = () => api.get('/contabilidad/semanal').then(r => r.data)
export const getContMensual = () => api.get('/contabilidad/mensual').then(r => r.data)
export const getTopPlatos   = () => api.get('/contabilidad/top-platos').then(r => r.data)

// ── Password Recovery ────────────────────────────────────────────────────────
export const forgotPassword = (email: string) =>
  api.post('/public/forgot-password', { email }).then(r => r.data)

export const updatePedidoEstado = (id: number, estado: string) =>
  api.patch(`/pedidos/${id}/estado`, { estado }).then(r => r.data)

export const getOrderStatus = (slug: string, codigo: string) =>
  api.get(`/public/${slug}/pedido/${codigo}`).then(r => r.data)

export const getOrderHistory = (slug: string, whatsapp: string) =>
  api.get(`/public/${slug}/historial/${whatsapp}`).then(r => r.data)
