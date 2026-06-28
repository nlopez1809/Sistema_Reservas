-- ============================================================
--  SUPABASE STORAGE — Bucket para imágenes QR de pago
--  Ejecutar en: Supabase > SQL Editor > New Query
-- ============================================================

-- 1. Crear el bucket (público para que los clientes puedan ver el QR)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'qr-pagos',
  'qr-pagos',
  true,
  2097152,  -- 2 MB máximo
  ARRAY['image/jpeg','image/jpg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Política: cualquiera puede leer (para que clientes descarguen el QR)
CREATE POLICY "qr_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'qr-pagos');

-- 3. Política: solo usuarios autenticados pueden subir/actualizar/eliminar
CREATE POLICY "qr_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'qr-pagos' AND auth.role() = 'authenticated'
  );

CREATE POLICY "qr_auth_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'qr-pagos' AND auth.role() = 'authenticated'
  );

CREATE POLICY "qr_auth_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'qr-pagos' AND auth.role() = 'authenticated'
  );

-- 4. Agregar columna qr_url a la tabla restaurantes
ALTER TABLE restaurantes
  ADD COLUMN IF NOT EXISTS qr_url TEXT;

-- ============================================================
-- VERIFICAR
-- ============================================================
SELECT id, name, public FROM storage.buckets WHERE id = 'qr-pagos';
