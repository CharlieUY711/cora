-- Categorías (hijo de departamentos)
CREATE TABLE IF NOT EXISTS categorias (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  departamento_id uuid NOT NULL REFERENCES departamentos(id) ON DELETE CASCADE,
  nombre        text NOT NULL,
  icono         text,
  color         text,
  orden         int DEFAULT 0,
  activo        boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Subcategorías (hijo de categorías)
CREATE TABLE IF NOT EXISTS subcategorias (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id  uuid NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  nombre        text NOT NULL,
  orden         int DEFAULT 0,
  activo        boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Campos adicionales en departamentos
ALTER TABLE departamentos
  ADD COLUMN IF NOT EXISTS moneda     text DEFAULT 'UYU' CHECK (moneda IN ('UYU','USD','EUR')),
  ADD COLUMN IF NOT EXISTS edad_minima text DEFAULT 'Todas' CHECK (edad_minima IN ('Todas','+18')),
  ADD COLUMN IF NOT EXISTS alcance    text DEFAULT 'Local' CHECK (alcance IN ('Local','Nacional','Internacional'));

-- Tabla de disputas para SecondHand
CREATE TABLE IF NOT EXISTS disputas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id    uuid REFERENCES productos_secondhand(id) ON DELETE SET NULL,
  comprador_id   uuid,
  vendedor_id    uuid,
  motivo         text NOT NULL,
  descripcion    text,
  estado         text DEFAULT 'abierta' CHECK (estado IN ('abierta','en_revision','resuelta','cerrada')),
  resolucion     text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- RLS: permitir acceso con service_role (Edge Functions)
ALTER TABLE categorias    ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputas      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role full access categorias"    ON categorias    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role full access subcategorias" ON subcategorias FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role full access disputas"      ON disputas      FOR ALL TO service_role USING (true) WITH CHECK (true);
