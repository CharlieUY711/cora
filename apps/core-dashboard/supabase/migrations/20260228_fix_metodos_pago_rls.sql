-- Corregir políticas RLS para metodos_pago
-- Asegurar que service_role puede hacer todas las operaciones

-- Verificar si la tabla existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'metodos_pago') THEN
    RAISE EXCEPTION 'La tabla metodos_pago no existe. Ejecuta primero 20260228_activar_metodos_pago_final.sql';
  END IF;
END $$;

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "service_role_metodos_pago" ON metodos_pago;
DROP POLICY IF EXISTS "authenticated_read_metodos_pago" ON metodos_pago;
DROP POLICY IF EXISTS "anon_read_metodos_pago" ON metodos_pago;
DROP POLICY IF EXISTS "authenticated_full_metodos_pago" ON metodos_pago;

-- Política para service_role (permite TODO - usado por Edge Functions)
CREATE POLICY "service_role_metodos_pago" 
  ON metodos_pago 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Política para authenticated: lectura completa
CREATE POLICY "authenticated_read_metodos_pago" 
  ON metodos_pago 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Política para authenticated: INSERT, UPDATE, DELETE (para admin)
CREATE POLICY "authenticated_full_metodos_pago" 
  ON metodos_pago 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Política para anon: solo lectura (para checkout público)
CREATE POLICY "anon_read_metodos_pago" 
  ON metodos_pago 
  FOR SELECT 
  TO anon 
  USING (activo = true);

-- Verificar políticas creadas
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'metodos_pago'
ORDER BY policyname;
