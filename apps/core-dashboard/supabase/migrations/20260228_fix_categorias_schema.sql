-- ==============================================================================
-- FIX: Corregir schema cache de PostgREST para categorias/subcategorias
-- ==============================================================================

-- Asegurar que la columna 'color' existe en categorias
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS color text;

-- Asegurar que la foreign key entre subcategorias y categorias está correctamente definida
-- PostgREST detecta automáticamente las relaciones basadas en foreign keys
-- Si la constraint ya existe, esto no hará nada (no hay IF NOT EXISTS para constraints)
DO $$
DECLARE
  constraint_exists boolean;
BEGIN
  -- Verificar si ya existe una foreign key constraint
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'subcategorias' 
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%categoria_id%'
  ) INTO constraint_exists;
  
  -- Si no existe, crearla
  IF NOT constraint_exists THEN
    ALTER TABLE subcategorias 
    ADD CONSTRAINT subcategorias_categoria_id_fkey 
    FOREIGN KEY (categoria_id) 
    REFERENCES categorias(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Verificar que las tablas y columnas existen
-- Esto ayuda a forzar la actualización del schema cache
SELECT 
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'categorias' AND column_name = 'color') as color_exists,
  (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name = 'subcategorias' AND constraint_type = 'FOREIGN KEY') as fk_exists;
