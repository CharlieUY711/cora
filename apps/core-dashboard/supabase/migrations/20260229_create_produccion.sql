-- Producción: Artículos Compuestos y Órdenes de Armado
CREATE TABLE IF NOT EXISTS produccion_articulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  sku TEXT UNIQUE,
  tipo TEXT NOT NULL CHECK (tipo IN ('kit', 'canasta', 'combo', 'pack')),
  descripcion TEXT,
  componentes JSONB DEFAULT '[]'::jsonb,
  tiempo_armado INTEGER DEFAULT 0,
  costo_mano_obra NUMERIC DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS produccion_ordenes_armado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT UNIQUE,
  articulo_id UUID REFERENCES produccion_articulos(id) ON DELETE SET NULL,
  articulo_nombre TEXT,
  cantidad INTEGER NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'completada', 'cancelada')),
  ruta TEXT,
  operario TEXT,
  fecha_pedido TIMESTAMPTZ,
  fecha_entrega TIMESTAMPTZ,
  prioridad TEXT DEFAULT 'normal' CHECK (prioridad IN ('alta', 'normal', 'baja')),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_produccion_articulos_activo ON produccion_articulos(activo);
CREATE INDEX IF NOT EXISTS idx_produccion_articulos_tipo ON produccion_articulos(tipo);
CREATE INDEX IF NOT EXISTS idx_produccion_ordenes_estado ON produccion_ordenes_armado(estado);
CREATE INDEX IF NOT EXISTS idx_produccion_ordenes_articulo_id ON produccion_ordenes_armado(articulo_id);

ALTER TABLE produccion_articulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE produccion_ordenes_armado ENABLE ROW LEVEL SECURITY;

-- RLS Policies para produccion_articulos
CREATE POLICY "service_role_produccion_articulos" 
  ON produccion_articulos FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_produccion_articulos" 
  ON produccion_articulos FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_full_produccion_articulos" 
  ON produccion_articulos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_read_produccion_articulos" 
  ON produccion_articulos FOR SELECT TO anon USING (activo = true);

-- RLS Policies para produccion_ordenes_armado
CREATE POLICY "service_role_produccion_ordenes_armado" 
  ON produccion_ordenes_armado FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_produccion_ordenes_armado" 
  ON produccion_ordenes_armado FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_full_produccion_ordenes_armado" 
  ON produccion_ordenes_armado FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_read_produccion_ordenes_armado" 
  ON produccion_ordenes_armado FOR SELECT TO anon USING (true);
