-- Verificar si la tabla existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'metodos_pago')
    THEN 'La tabla metodos_pago EXISTE'
    ELSE 'La tabla metodos_pago NO EXISTE'
  END as estado_tabla;

-- Si existe, mostrar su estructura
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'metodos_pago'
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'metodos_pago';

-- Verificar si RLS está habilitado
SELECT 
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE tablename = 'metodos_pago';

-- Contar métodos existentes
SELECT 
  COUNT(*) as total_metodos,
  COUNT(*) FILTER (WHERE activo = true) as metodos_activos,
  COUNT(*) FILTER (WHERE activo = false) as metodos_inactivos
FROM metodos_pago;

-- Mostrar todos los métodos
SELECT 
  id,
  nombre,
  tipo,
  proveedor,
  activo,
  orden,
  created_at
FROM metodos_pago
ORDER BY orden, created_at;
