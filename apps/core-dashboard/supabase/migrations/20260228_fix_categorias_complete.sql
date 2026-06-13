-- ==============================================================================
-- FIX COMPLETO: Asegurar que la tabla categorias existe con todas las columnas
-- ==============================================================================

-- Crear tabla categorias si no existe, con todas las columnas necesarias
-- Usar NULL primero, luego haremos NOT NULL después de asegurar que hay datos
CREATE TABLE IF NOT EXISTS categorias (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  departamento_id uuid,
  nombre        text,
  icono         text,
  color         text,
  orden         int DEFAULT 0,
  activo        boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Asegurar que todas las columnas existen (por si la tabla ya existía sin algunas)
-- Solo agregar columnas que no existen, sin tocar id (PRIMARY KEY)
DO $$
BEGIN
  -- departamento_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categorias' AND column_name = 'departamento_id') THEN
    ALTER TABLE categorias ADD COLUMN departamento_id uuid;
  END IF;
  
  -- nombre
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categorias' AND column_name = 'nombre') THEN
    ALTER TABLE categorias ADD COLUMN nombre text;
  END IF;
  
  -- icono
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categorias' AND column_name = 'icono') THEN
    ALTER TABLE categorias ADD COLUMN icono text;
  END IF;
  
  -- color
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categorias' AND column_name = 'color') THEN
    ALTER TABLE categorias ADD COLUMN color text;
  END IF;
  
  -- orden
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categorias' AND column_name = 'orden') THEN
    ALTER TABLE categorias ADD COLUMN orden int DEFAULT 0;
  END IF;
  
  -- activo
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categorias' AND column_name = 'activo') THEN
    ALTER TABLE categorias ADD COLUMN activo boolean DEFAULT true;
  END IF;
  
  -- created_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categorias' AND column_name = 'created_at') THEN
    ALTER TABLE categorias ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  
  -- updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categorias' AND column_name = 'updated_at') THEN
    ALTER TABLE categorias ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Agregar foreign key a departamentos si no existe (DESPUÉS de asegurar que la columna existe)
DO $$
BEGIN
  -- Verificar que la columna existe primero
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categorias' AND column_name = 'departamento_id') THEN
    -- Verificar que la foreign key no existe
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'categorias' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%departamento_id%'
    ) THEN
      ALTER TABLE categorias 
      ADD CONSTRAINT categorias_departamento_id_fkey 
      FOREIGN KEY (departamento_id) 
      REFERENCES departamentos(id) 
      ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Hacer departamento_id NOT NULL si no lo es
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categorias' 
      AND column_name = 'departamento_id' 
      AND is_nullable = 'YES'
  ) THEN
    -- Primero asegurar que no hay valores NULL
    UPDATE categorias SET departamento_id = (SELECT id FROM departamentos LIMIT 1) WHERE departamento_id IS NULL;
    -- Luego hacer NOT NULL
    ALTER TABLE categorias ALTER COLUMN departamento_id SET NOT NULL;
  END IF;
END $$;

-- Hacer nombre NOT NULL si no lo es
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categorias' 
      AND column_name = 'nombre' 
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE categorias ALTER COLUMN nombre SET NOT NULL;
  END IF;
END $$;

-- Asegurar que id es PRIMARY KEY
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'categorias' 
      AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE categorias ADD PRIMARY KEY (id);
  END IF;
END $$;

-- Crear tabla subcategorias si no existe
CREATE TABLE IF NOT EXISTS subcategorias (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id  uuid NOT NULL,
  nombre        text NOT NULL,
  orden         int DEFAULT 0,
  activo        boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Agregar foreign key de subcategorias a categorias
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'subcategorias' 
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%categoria_id%'
  ) THEN
    ALTER TABLE subcategorias 
    ADD CONSTRAINT subcategorias_categoria_id_fkey 
    FOREIGN KEY (categoria_id) 
    REFERENCES categorias(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Asegurar RLS está habilitado
ALTER TABLE categorias    ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategorias ENABLE ROW LEVEL SECURITY;

-- Asegurar políticas RLS para service_role
DO $$
BEGIN
  -- Política para categorias
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'categorias' 
      AND policyname = 'service_role full access categorias'
  ) THEN
    CREATE POLICY "service_role full access categorias" 
    ON categorias FOR ALL TO service_role 
    USING (true) WITH CHECK (true);
  END IF;
  
  -- Política para subcategorias
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'subcategorias' 
      AND policyname = 'service_role full access subcategorias'
  ) THEN
    CREATE POLICY "service_role full access subcategorias" 
    ON subcategorias FOR ALL TO service_role 
    USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Verificar estructura final
SELECT 
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'categorias' AND column_name = 'departamento_id') as tiene_departamento_id,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'categorias' AND column_name = 'color') as tiene_color,
  (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name = 'categorias' AND constraint_type = 'FOREIGN KEY') as tiene_fk_departamento,
  (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name = 'subcategorias' AND constraint_type = 'FOREIGN KEY') as tiene_fk_categoria;
