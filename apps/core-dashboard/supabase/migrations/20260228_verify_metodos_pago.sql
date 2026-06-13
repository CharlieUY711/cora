-- ═══════════════════════════════════════════════════════════════════════════════
-- Verificación de Métodos de Pago
-- Proyecto: qhnmxvexkizcsmivfuam
-- ═══════════════════════════════════════════════════════════════════════════════

-- Verificar si la tabla existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'metodos_pago')
    THEN '✓ La tabla metodos_pago existe'
    ELSE '✗ La tabla metodos_pago NO existe'
  END as estado_tabla;

-- Si la tabla existe, mostrar el resumen
DO $$
DECLARE
  total_metodos int;
  metodos_activos int;
  metodos_inactivos int;
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'metodos_pago') THEN
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE activo = true),
      COUNT(*) FILTER (WHERE activo = false)
    INTO total_metodos, metodos_activos, metodos_inactivos
    FROM metodos_pago;
    
    RAISE NOTICE '=== Resumen de Métodos de Pago ===';
    RAISE NOTICE 'Total: %, Activos: %, Inactivos: %', total_metodos, metodos_activos, metodos_inactivos;
    
    -- Mostrar todos los métodos
    FOR rec IN 
      SELECT id, nombre, tipo, proveedor, activo, orden 
      FROM metodos_pago 
      ORDER BY orden, created_at
    LOOP
      RAISE NOTICE '  - % [%] % (Tipo: %, Proveedor: %, Activo: %)', 
        rec.nombre, rec.id, 
        CASE WHEN rec.activo THEN '✓' ELSE '✗' END,
        rec.tipo, 
        COALESCE(rec.proveedor, 'N/A'),
        rec.activo;
    END LOOP;
  ELSE
    RAISE NOTICE '⚠ La tabla metodos_pago no existe. Necesitas crear la tabla primero.';
  END IF;
END $$;

-- Mostrar todos los métodos de pago en formato tabla
SELECT 
  id,
  nombre,
  tipo,
  COALESCE(proveedor, 'N/A') as proveedor,
  activo,
  orden,
  created_at
FROM metodos_pago
ORDER BY orden, created_at;
