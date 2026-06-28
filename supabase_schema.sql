-- ============================================================
--  SISTEMA DE RESERVAS — MULTI-TENANT SaaS
--  SSH Soluciones Bolivia © 2026
--  Ejecutar en: Supabase > SQL Editor > New Query
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- EXTENSIONES
-- ──────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────────────────
-- 1. RESTAURANTES (tenants)
--    Cada restaurante tiene su propio owner en auth.users
-- ──────────────────────────────────────────────────────────
CREATE TABLE restaurantes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre        VARCHAR(150) NOT NULL,
  slug          VARCHAR(60)  NOT NULL UNIQUE,  -- URL pública: /menu/mi-pension
  descripcion   TEXT,
  logo_url      TEXT,
  telefono      VARCHAR(20),
  direccion     TEXT,
  ciudad        VARCHAR(100) DEFAULT 'La Paz',
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  plan          VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','enterprise')),
  creado_en     TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_restaurantes_owner  ON restaurantes(owner_id);
CREATE INDEX idx_restaurantes_slug   ON restaurantes(slug);
CREATE INDEX idx_restaurantes_activo ON restaurantes(activo);

-- ──────────────────────────────────────────────────────────
-- 2. PERFIL DE USUARIO (extensión de auth.users)
-- ──────────────────────────────────────────────────────────
CREATE TABLE perfiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre          VARCHAR(100),
  apellido        VARCHAR(100),
  restaurante_id  UUID REFERENCES restaurantes(id) ON DELETE SET NULL,
  rol             VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (rol IN ('admin','staff')),
  creado_en       TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO perfiles (id, nombre, apellido)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    COALESCE(NEW.raw_user_meta_data->>'apellido', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ──────────────────────────────────────────────────────────
-- 3. DÍAS (por restaurante)
-- ──────────────────────────────────────────────────────────
CREATE TABLE dias (
  id              SERIAL PRIMARY KEY,
  restaurante_id  UUID NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  nombre          VARCHAR(20) NOT NULL,
  habilitado      BOOLEAN NOT NULL DEFAULT TRUE,
  orden           SMALLINT NOT NULL,
  UNIQUE(restaurante_id, nombre)
);

CREATE INDEX idx_dias_restaurante ON dias(restaurante_id);

-- ──────────────────────────────────────────────────────────
-- 4. PLATOS (por restaurante)
-- ──────────────────────────────────────────────────────────
CREATE TABLE platos (
  id              SERIAL PRIMARY KEY,
  restaurante_id  UUID NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  dia_id          INTEGER NOT NULL REFERENCES dias(id) ON DELETE CASCADE,
  categoria       VARCHAR(10) NOT NULL CHECK (categoria IN ('sopa','segundo','extra')),
  nombre          VARCHAR(100) NOT NULL,
  descripcion     TEXT,
  precio          NUMERIC(8,2) NOT NULL CHECK (precio >= 0),
  emoji           VARCHAR(10) DEFAULT '🍽️',
  stock           INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_inicial   INTEGER NOT NULL DEFAULT 0,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en       TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_platos_restaurante ON platos(restaurante_id);
CREATE INDEX idx_platos_dia         ON platos(dia_id);

-- ──────────────────────────────────────────────────────────
-- 5. CLIENTES (por restaurante)
-- ──────────────────────────────────────────────────────────
CREATE TABLE clientes (
  id              SERIAL PRIMARY KEY,
  restaurante_id  UUID NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  nombre          VARCHAR(100) NOT NULL,
  apellido        VARCHAR(100) NOT NULL,
  whatsapp        VARCHAR(20)  NOT NULL,
  total_pedidos   INTEGER NOT NULL DEFAULT 0,
  ultimo_pedido   TIMESTAMPTZ,
  creado_en       TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurante_id, whatsapp)
);

CREATE INDEX idx_clientes_restaurante ON clientes(restaurante_id);
CREATE INDEX idx_clientes_whatsapp    ON clientes(restaurante_id, whatsapp);

-- ──────────────────────────────────────────────────────────
-- 6. PEDIDOS
-- ──────────────────────────────────────────────────────────
CREATE TABLE pedidos (
  id              SERIAL PRIMARY KEY,
  restaurante_id  UUID NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  codigo          VARCHAR(20) NOT NULL,
  cliente_id      INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  dia_id          INTEGER REFERENCES dias(id) ON DELETE SET NULL,
  consumo         VARCHAR(10) NOT NULL CHECK (consumo IN ('local','llevar')),
  metodo_pago     VARCHAR(10) NOT NULL CHECK (metodo_pago IN ('efectivo','qr')),
  hora_recojo     VARCHAR(10),
  total           NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  estado          VARCHAR(15) NOT NULL DEFAULT 'confirmado'
                    CHECK (estado IN ('pendiente','confirmado','cancelado')),
  creado_en       TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurante_id, codigo)
);

CREATE INDEX idx_pedidos_restaurante ON pedidos(restaurante_id);
CREATE INDEX idx_pedidos_fecha       ON pedidos(restaurante_id, creado_en);

-- ──────────────────────────────────────────────────────────
-- 7. DETALLE DE PEDIDOS
-- ──────────────────────────────────────────────────────────
CREATE TABLE pedido_detalle (
  id          SERIAL PRIMARY KEY,
  pedido_id   INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  plato_id    INTEGER REFERENCES platos(id) ON DELETE SET NULL,
  nombre      VARCHAR(100) NOT NULL,
  precio      NUMERIC(8,2) NOT NULL,
  cantidad    INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  tipo_linea  VARCHAR(10) NOT NULL CHECK (tipo_linea IN ('sopa','segundo','extra','combo')),
  combo_num   SMALLINT,
  subtotal    NUMERIC(10,2) GENERATED ALWAYS AS (precio * cantidad) STORED
);

CREATE INDEX idx_detalle_pedido ON pedido_detalle(pedido_id);

-- ──────────────────────────────────────────────────────────
-- 8. FUNCIÓN: actualizar timestamps
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.actualizado_en = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_restaurantes_updated BEFORE UPDATE ON restaurantes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_platos_updated       BEFORE UPDATE ON platos       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_clientes_updated     BEFORE UPDATE ON clientes      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pedidos_updated      BEFORE UPDATE ON pedidos       FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ──────────────────────────────────────────────────────────
-- 9. FUNCIÓN: registrar pedido (transacción atómica)
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION registrar_pedido(
  p_restaurante_id UUID,
  p_codigo         VARCHAR,
  p_nombre         VARCHAR,
  p_apellido       VARCHAR,
  p_whatsapp       VARCHAR,
  p_hora_recojo    VARCHAR,
  p_consumo        VARCHAR,
  p_metodo_pago    VARCHAR,
  p_total          NUMERIC,
  p_dia_nombre     VARCHAR,
  p_items          JSONB
)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  v_cliente_id INTEGER;
  v_dia_id     INTEGER;
  v_pedido_id  INTEGER;
  item         JSONB;
BEGIN
  -- Upsert cliente (único por restaurante + whatsapp)
  INSERT INTO clientes (restaurante_id, nombre, apellido, whatsapp, total_pedidos, ultimo_pedido)
  VALUES (p_restaurante_id, p_nombre, p_apellido, p_whatsapp, 1, NOW())
  ON CONFLICT (restaurante_id, whatsapp) DO UPDATE SET
    nombre        = EXCLUDED.nombre,
    apellido      = EXCLUDED.apellido,
    total_pedidos = clientes.total_pedidos + 1,
    ultimo_pedido = NOW(),
    actualizado_en = NOW()
  RETURNING id INTO v_cliente_id;

  SELECT id INTO v_dia_id FROM dias
  WHERE restaurante_id = p_restaurante_id AND nombre = p_dia_nombre;

  INSERT INTO pedidos (restaurante_id, codigo, cliente_id, dia_id, consumo, metodo_pago, hora_recojo, total)
  VALUES (p_restaurante_id, p_codigo, v_cliente_id, v_dia_id, p_consumo, p_metodo_pago, p_hora_recojo, p_total)
  RETURNING id INTO v_pedido_id;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO pedido_detalle (pedido_id, plato_id, nombre, precio, cantidad, tipo_linea, combo_num)
    VALUES (
      v_pedido_id,
      NULLIF((item->>'plato_id')::TEXT, '')::INTEGER,
      item->>'nombre',
      (item->>'precio')::NUMERIC,
      (item->>'cantidad')::INTEGER,
      item->>'tipo_linea',
      NULLIF(item->>'combo_num','')::SMALLINT
    );
    IF (item->>'plato_id') IS NOT NULL AND (item->>'plato_id') != '' THEN
      UPDATE platos SET stock = GREATEST(0, stock - (item->>'cantidad')::INTEGER)
      WHERE id = (item->>'plato_id')::INTEGER AND restaurante_id = p_restaurante_id;
    END IF;
  END LOOP;

  RETURN v_pedido_id;
END;
$$;

-- ──────────────────────────────────────────────────────────
-- 10. VISTAS DE CONTABILIDAD (filtradas por restaurante)
-- ──────────────────────────────────────────────────────────
CREATE VIEW v_contabilidad_diaria AS
SELECT
  p.restaurante_id,
  DATE(p.creado_en AT TIME ZONE 'America/La_Paz') AS fecha,
  COUNT(*)                                          AS total_pedidos,
  SUM(p.total)                                      AS total_recaudado,
  SUM(CASE WHEN p.metodo_pago='efectivo' THEN p.total ELSE 0 END) AS total_efectivo,
  SUM(CASE WHEN p.metodo_pago='qr'       THEN p.total ELSE 0 END) AS total_qr,
  SUM(CASE WHEN p.consumo='local'  THEN 1 ELSE 0 END) AS pedidos_local,
  SUM(CASE WHEN p.consumo='llevar' THEN 1 ELSE 0 END) AS pedidos_llevar
FROM pedidos p WHERE p.estado = 'confirmado'
GROUP BY p.restaurante_id, DATE(p.creado_en AT TIME ZONE 'America/La_Paz')
ORDER BY fecha DESC;

CREATE VIEW v_contabilidad_semanal AS
SELECT
  p.restaurante_id,
  DATE_TRUNC('week', p.creado_en AT TIME ZONE 'America/La_Paz')::DATE AS semana_inicio,
  (DATE_TRUNC('week', p.creado_en AT TIME ZONE 'America/La_Paz') + INTERVAL '6 days')::DATE AS semana_fin,
  COUNT(*) AS total_pedidos,
  SUM(p.total) AS total_recaudado,
  SUM(CASE WHEN p.metodo_pago='efectivo' THEN p.total ELSE 0 END) AS total_efectivo,
  SUM(CASE WHEN p.metodo_pago='qr'       THEN p.total ELSE 0 END) AS total_qr,
  SUM(CASE WHEN p.consumo='local'  THEN 1 ELSE 0 END) AS pedidos_local,
  SUM(CASE WHEN p.consumo='llevar' THEN 1 ELSE 0 END) AS pedidos_llevar
FROM pedidos p WHERE p.estado = 'confirmado'
GROUP BY p.restaurante_id, DATE_TRUNC('week', p.creado_en AT TIME ZONE 'America/La_Paz')
ORDER BY semana_inicio DESC;

CREATE VIEW v_contabilidad_mensual AS
SELECT
  p.restaurante_id,
  TO_CHAR(p.creado_en AT TIME ZONE 'America/La_Paz', 'Month YYYY') AS mes,
  DATE_TRUNC('month', p.creado_en AT TIME ZONE 'America/La_Paz')::DATE AS mes_inicio,
  COUNT(*) AS total_pedidos,
  SUM(p.total) AS total_recaudado,
  SUM(CASE WHEN p.metodo_pago='efectivo' THEN p.total ELSE 0 END) AS total_efectivo,
  SUM(CASE WHEN p.metodo_pago='qr'       THEN p.total ELSE 0 END) AS total_qr,
  SUM(CASE WHEN p.consumo='local'  THEN 1 ELSE 0 END) AS pedidos_local,
  SUM(CASE WHEN p.consumo='llevar' THEN 1 ELSE 0 END) AS pedidos_llevar
FROM pedidos p WHERE p.estado = 'confirmado'
GROUP BY p.restaurante_id, TO_CHAR(p.creado_en AT TIME ZONE 'America/La_Paz','Month YYYY'),
         DATE_TRUNC('month', p.creado_en AT TIME ZONE 'America/La_Paz')
ORDER BY mes_inicio DESC;

CREATE VIEW v_platos_mas_vendidos AS
SELECT
  pe.restaurante_id,
  d.nombre AS plato,
  d.tipo_linea,
  SUM(d.cantidad) AS total_vendido,
  SUM(d.subtotal) AS total_recaudado
FROM pedido_detalle d
JOIN pedidos pe ON pe.id = d.pedido_id
WHERE pe.estado = 'confirmado'
GROUP BY pe.restaurante_id, d.nombre, d.tipo_linea
ORDER BY total_vendido DESC;

-- ──────────────────────────────────────────────────────────
-- 11. ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────
ALTER TABLE restaurantes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dias          ENABLE ROW LEVEL SECURITY;
ALTER TABLE platos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_detalle ENABLE ROW LEVEL SECURITY;

-- Helper: obtener restaurante_id del usuario autenticado
CREATE OR REPLACE FUNCTION my_restaurante_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT restaurante_id FROM perfiles WHERE id = auth.uid()
$$;

-- Restaurantes: el owner ve y edita el suyo
CREATE POLICY "restaurante_owner_all" ON restaurantes
  FOR ALL USING (owner_id = auth.uid());

-- Restaurantes: lectura pública por slug (para la página del cliente)
CREATE POLICY "restaurante_slug_public" ON restaurantes
  FOR SELECT USING (activo = TRUE);

-- Perfiles: cada usuario ve y edita el suyo
CREATE POLICY "perfil_propio" ON perfiles
  FOR ALL USING (id = auth.uid());

-- Días: admin del restaurante tiene acceso total
CREATE POLICY "dias_admin" ON dias
  FOR ALL USING (restaurante_id = my_restaurante_id());

-- Días: lectura pública para la página del cliente
CREATE POLICY "dias_public_read" ON dias
  FOR SELECT USING (TRUE);

-- Platos: admin del restaurante
CREATE POLICY "platos_admin" ON platos
  FOR ALL USING (restaurante_id = my_restaurante_id());

-- Platos: lectura pública de los activos
CREATE POLICY "platos_public_read" ON platos
  FOR SELECT USING (activo = TRUE);

-- Clientes: solo el admin del restaurante
CREATE POLICY "clientes_admin" ON clientes
  FOR ALL USING (restaurante_id = my_restaurante_id());

-- Pedidos: admin del restaurante ve los suyos
CREATE POLICY "pedidos_admin" ON pedidos
  FOR ALL USING (restaurante_id = my_restaurante_id());

-- Pedidos: cualquiera puede insertar (cliente haciendo reserva)
CREATE POLICY "pedidos_public_insert" ON pedidos
  FOR INSERT WITH CHECK (TRUE);

-- Detalle: admin del restaurante
CREATE POLICY "detalle_admin" ON pedido_detalle
  FOR ALL USING (
    EXISTS (SELECT 1 FROM pedidos p WHERE p.id = pedido_id AND p.restaurante_id = my_restaurante_id())
  );

-- Detalle: inserción pública para reservas
CREATE POLICY "detalle_public_insert" ON pedido_detalle
  FOR INSERT WITH CHECK (TRUE);

-- ──────────────────────────────────────────────────────────
-- 12. FUNCIÓN: setup inicial al crear restaurante
--     Inserta los 7 días automáticamente
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION setup_restaurante(p_restaurante_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO dias (restaurante_id, nombre, habilitado, orden) VALUES
    (p_restaurante_id, 'Lunes',      TRUE, 1),
    (p_restaurante_id, 'Martes',     TRUE, 2),
    (p_restaurante_id, 'Miércoles',  TRUE, 3),
    (p_restaurante_id, 'Jueves',     TRUE, 4),
    (p_restaurante_id, 'Viernes',    TRUE, 5),
    (p_restaurante_id, 'Sábado',     TRUE, 6),
    (p_restaurante_id, 'Domingo',    TRUE, 7);
END;
$$;

-- ──────────────────────────────────────────────────────────
-- FIN DEL SCHEMA
-- ──────────────────────────────────────────────────────────
