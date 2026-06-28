-- ============================================================
--  RESETEO AUTOMÁTICO DE STOCK DIARIO
--  Ejecutar en: Supabase > SQL Editor > New Query
-- ============================================================

-- 1. Habilitar la extensión pg_cron (solo si no está activa)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Programar el reseteo diario a las 6:00 AM hora Bolivia
--    Bolivia = UTC-4, entonces 06:00 BO = 10:00 UTC
SELECT cron.schedule(
  'reset-stock-diario',       -- nombre del job (único)
  '0 10 * * *',               -- cada día a las 10:00 UTC (06:00 Bolivia)
  $$
    UPDATE platos
    SET stock = stock_inicial
    WHERE activo = true;
  $$
);

-- 3. Verificar que el job quedó programado
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'reset-stock-diario';

-- ============================================================
-- FUNCIÓN: resetear stock de un restaurante específico
-- (usada por el botón manual del admin)
-- ============================================================
CREATE OR REPLACE FUNCTION reset_stock_restaurante(p_restaurante_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE platos
  SET stock = stock_inicial
  WHERE restaurante_id = p_restaurante_id
    AND activo = true;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 4. Verificar la función
SELECT reset_stock_restaurante('00000000-0000-0000-0000-000000000000'::UUID);
-- (devuelve 0 si no hay platos con ese UUID — solo es para probar que existe)

-- ============================================================
-- NOTAS
-- ============================================================
-- Si pg_cron no está disponible en tu plan de Supabase:
-- Ve a Supabase → Database → Extensions → busca "pg_cron" → Enable
-- O usa la alternativa de Edge Functions (ver abajo)
--
-- Para ver todos los jobs programados:
--   SELECT * FROM cron.job;
--
-- Para eliminar el job si necesitas cambiar el horario:
--   SELECT cron.unschedule('reset-stock-diario');
--
-- Para cambiar la hora (ej: 7am Bolivia = 11:00 UTC):
--   SELECT cron.unschedule('reset-stock-diario');
--   SELECT cron.schedule('reset-stock-diario', '0 11 * * *', $$ UPDATE platos SET stock = stock_inicial WHERE activo = true $$);
-- ============================================================
