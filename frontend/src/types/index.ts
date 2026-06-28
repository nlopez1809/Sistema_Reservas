export interface Restaurante {
  id: string
  nombre: string
  slug: string
  descripcion?: string
  logo_url?: string
  qr_url?: string
  telefono?: string
  direccion?: string
  ciudad?: string
  owner_id: string
  activo: boolean
  plan: 'free' | 'pro' | 'enterprise'
  creado_en: string
}

export interface Perfil {
  id: string
  nombre?: string
  apellido?: string
  restaurante_id?: string
  rol: 'admin' | 'staff'
}

export interface Dia {
  id: number
  restaurante_id: string
  nombre: string
  habilitado: boolean
  orden: number
  mensaje_deshabilitado?: string
}

export type Categoria = 'sopa' | 'segundo' | 'extra'

export interface Plato {
  id: number
  restaurante_id: string
  dia_id: number
  categoria: Categoria
  nombre: string
  descripcion: string
  precio: number
  emoji: string
  stock: number
  stock_inicial: number
  activo: boolean
}

export interface MenuDia {
  dia: Dia
  sopas: Plato[]
  segundos: Plato[]
  extra: Plato | null
}

export interface Combo {
  sopaIdx: number | null
  segundoIdx: number | null
  qty: number
}

export type CartItem =
  | { type: 'completo'; day: string; combos: Combo[] }
  | { type: 'sopa' | 'segundo' | 'extra'; day: string; idx: number; qty: number }

export type Cart = Record<string, CartItem>

export interface Cliente {
  id?: number
  restaurante_id?: string
  nombre: string
  apellido: string
  whatsapp: string
  total_pedidos?: number
  ultimo_pedido?: string
}

export type Consumo = 'local' | 'llevar'
export type MetodoPago = 'efectivo' | 'qr'

export interface PedidoItem {
  plato_id?: number
  nombre: string
  precio: number
  cantidad: number
  tipo_linea: Categoria | 'combo'
  combo_num?: number
  comboNum?: number
  ciType?: Categoria
  day?: string
  listKey?: string
  idx?: number
}

export interface PedidoPayload {
  codigo: string
  nombre: string
  apellido: string
  whatsapp: string
  hora_recojo: string
  consumo: Consumo
  metodo_pago: MetodoPago
  total: number
  dia_nombre: string
  items: PedidoItem[]
}

export interface Pedido {
  id: number
  restaurante_id: string
  codigo: string
  cliente_id: number | null
  dia_id: number | null
  consumo: Consumo
  metodo_pago: MetodoPago
  hora_recojo: string
  total: number
  estado: string
  creado_en: string
  cliente?: Cliente
  dia?: Dia
}

export interface AuthUser {
  id: string
  email?: string
  user_metadata?: { nombre?: string; apellido?: string }
}

export interface AppSession {
  user: AuthUser
  restaurante: Restaurante | null
  perfil: Perfil | null
}
