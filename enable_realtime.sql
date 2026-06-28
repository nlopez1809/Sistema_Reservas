-- ============================================================
--  HABILITAR REALTIME EN LA TABLA PEDIDOS
--  Ejecutar en: Supabase > SQL Editor > New Query
--
--  Esto permite que el panel admin reciba notificaciones
--  instantáneas cuando entra un nuevo pedido.
-- ============================================================

-- 1. Agregar la tabla pedidos a la publicación de Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE pedidos;

-- 2. Verificar que quedó habilitada
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- ============================================================
-- OPCIONAL: Reseteo automático de stock cada día a las 6am
-- (hora Bolivia = UTC-4, entonces 10:00 UTC = 06:00 Bolivia)
-- ============================================================

-- Habilitar pg_cron si no está activo (solo si tienes acceso)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Programar el reseteo diario
-- SELECT cron.schedule(
--   'reset-stock-diario',
--   '0 10 * * *',
--   $$UPDATE platos SET stock = stock_inicial WHERE activo = true$$
-- );
