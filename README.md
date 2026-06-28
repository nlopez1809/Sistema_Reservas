# 🍜 AlmuerzApp SaaS
**SSH Soluciones Bolivia © 2026** — Sistema Multi-Tenant de Reservas de Almuerzos

Stack: **React + TypeScript + Vite** · **Node.js + Express + TypeScript** · **Supabase Auth + DB**

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│  Restaurante A          Restaurante B          Restaurante C │
│  /menu/la-cocinita      /menu/don-pepe         /menu/mary    │
└──────────────┬──────────────────┬──────────────────┬────────┘
               │                  │                  │
        ┌──────▼──────────────────▼──────────────────▼──────┐
        │              Frontend (React + TS)                  │
        │  / (Landing)  /login  /register  /setup  /admin    │
        └──────────────────────┬─────────────────────────────┘
                               │ JWT (Supabase Auth)
        ┌──────────────────────▼─────────────────────────────┐
        │           Backend (Node + Express + TS)             │
        │  /api/public/:slug/*   (sin auth - clientes)        │
        │  /api/restaurante      (auth requerida)             │
        │  /api/dias  /api/platos  /api/pedidos  ...          │
        └──────────────────────┬─────────────────────────────┘
                               │ Service Key + RLS
        ┌──────────────────────▼─────────────────────────────┐
        │              Supabase (PostgreSQL + Auth)           │
        │  restaurantes · dias · platos · pedidos · clientes  │
        │  Row Level Security por restaurante_id              │
        └────────────────────────────────────────────────────┘
```

---

## 📁 Estructura

```
almuerzo-saas/
├── supabase_schema.sql          ← Ejecutar primero en Supabase
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── LandingPage.tsx  ← Página pública de marketing
│       │   ├── LoginPage.tsx    ← Login con Supabase Auth
│       │   ├── RegisterPage.tsx ← Registro de usuario
│       │   ├── SetupPage.tsx    ← Crear restaurante post-registro
│       │   ├── AdminPage.tsx    ← Panel admin completo
│       │   └── MenuPage.tsx     ← Página pública del cliente (/menu/:slug)
│       ├── context/
│       │   └── AuthContext.tsx  ← Session global (user + restaurante)
│       ├── hooks/
│       ├── lib/
│       │   ├── api.ts           ← Axios + JWT automático
│       │   ├── supabase.ts      ← Cliente Supabase frontend
│       │   └── utils.ts
│       └── types/index.ts
└── backend/
    └── src/
        ├── middleware/
        │   └── auth.ts          ← Verifica JWT + adjunta restauranteId
        ├── routes/
        │   ├── public.ts        ← Rutas sin auth (menu, pedidos de clientes)
        │   ├── restaurante.ts   ← CRUD restaurante
        │   ├── dias.ts
        │   ├── platos.ts
        │   ├── pedidos.ts
        │   ├── clientes.ts
        │   └── contabilidad.ts
        └── index.ts
```

---

## ⚙️ Setup paso a paso

### 1. Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. **SQL Editor → New Query** → pegar y ejecutar `supabase_schema.sql`
3. Guardar las 3 keys de **Settings → API**:
   - `Project URL` → `SUPABASE_URL`
   - `anon/public` → `SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_KEY` ⚠️ solo backend
4. En **Settings → JWT**: copiar el `JWT Secret` → `SUPABASE_JWT_SECRET`

### 2. Backend

```bash
cd backend
cp .env.example .env
# Completar con tus keys de Supabase
npm install
npm run dev        # http://localhost:3001
```

**`backend/.env`:**
```
PORT=3001
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_JWT_SECRET=tu-jwt-secret
FRONTEND_URL=http://localhost:5173
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# Completar con URL y anon key
npm install
npm run dev        # http://localhost:5173
```

**`frontend/.env`:**
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://localhost:3001
```

### 4. Todo junto (desde la raíz)

```bash
npm install
npm run install:all
npm run dev
```

---

## 🌐 Rutas

### Públicas (sin auth)
| Endpoint | Descripción |
|---|---|
| `GET /api/public/:slug/menu` | Menú del restaurante |
| `GET /api/public/:slug/dias` | Días habilitados |
| `POST /api/public/:slug/pedidos` | Crear reserva |

### Protegidas (requieren JWT de Supabase)
| Endpoint | Descripción |
|---|---|
| `POST /api/restaurante` | Crear restaurante |
| `GET /api/restaurante/me` | Mi restaurante |
| `PUT /api/restaurante/me` | Actualizar datos |
| `GET/PATCH /api/dias` | Gestión de días |
| `GET/POST/PUT/DELETE /api/platos` | Gestión de platos |
| `GET /api/pedidos` | Listar pedidos |
| `GET /api/clientes` | Listar clientes |
| `GET /api/contabilidad/diaria|semanal|mensual|top-platos` | Reportes |

---

## 🔐 Flujo de autenticación

```
1. Cliente se registra → Supabase crea usuario en auth.users
2. Trigger crea perfil en perfiles
3. Frontend redirige a /setup → usuario crea su restaurante
4. Backend crea restaurante + llama setup_restaurante() (crea 7 días)
5. Perfil se vincula al restaurante
6. Todas las requests al admin llevan el JWT en Authorization: Bearer <token>
7. Backend verifica JWT con Supabase → extrae restaurante_id → filtra datos
```

---

## 🚀 Despliegue

**Frontend → Vercel**
```bash
cd frontend && npm run build
# Configurar variables de entorno en Vercel
```

**Backend → Railway / Render**
```bash
cd backend && npm run build
# Start command: node dist/index.js
# Configurar variables de entorno en la plataforma
```

---

## 👤 Flujo del restaurante (nuevo usuario)

1. Entra a `/` → ve la landing page
2. Click "Registrar Restaurante" → `/register`
3. Completa nombre, apellido, email, contraseña
4. Redirigido a `/setup` → completa datos del restaurante (nombre, slug, ciudad…)
5. Backend crea el restaurante y los 7 días automáticamente
6. Redirigido a `/admin` → panel completo listo para usar
7. Comparte su link `/menu/su-slug` con los clientes
