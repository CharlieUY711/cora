-- Transportistas y Tramos
CREATE TABLE IF NOT EXISTS transportistas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('courier', 'propio', 'tercero', 'nacional', 'local', 'internacional')),
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  contacto TEXT,
  email TEXT,
  telefono TEXT,
  zonas JSONB DEFAULT '[]'::jsonb,
  tarifa_base NUMERIC,
  observaciones TEXT,
  logo TEXT,
  rating NUMERIC DEFAULT 0,
  envios_activos INTEGER DEFAULT 0,
  envios_totales INTEGER DEFAULT 0,
  tiempo_promedio TEXT,
  cobertura JSONB DEFAULT '[]'::jsonb,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tramos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origen TEXT NOT NULL,
  destino TEXT NOT NULL,
  distancia_km NUMERIC,
  tiempo_horas NUMERIC,
  transportista_id UUID REFERENCES transportistas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('local', 'intercity', 'internacional')),
  tiempo_estimado TEXT,
  tarifa_base NUMERIC,
  tarifa_kg NUMERIC,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transportistas_estado ON transportistas(estado);
CREATE INDEX IF NOT EXISTS idx_transportistas_activo ON transportistas(activo);
CREATE INDEX IF NOT EXISTS idx_tramos_transportista_id ON tramos(transportista_id);
CREATE INDEX IF NOT EXISTS idx_tramos_activo ON tramos(activo);

ALTER TABLE transportistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tramos ENABLE ROW LEVEL SECURITY;

-- RLS Policies para transportistas
CREATE POLICY "service_role_transportistas" 
  ON transportistas FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_transportistas" 
  ON transportistas FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_full_transportistas" 
  ON transportistas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_read_transportistas" 
  ON transportistas FOR SELECT TO anon USING (activo = true);

-- RLS Policies para tramos
CREATE POLICY "service_role_tramos" 
  ON tramos FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_tramos" 
  ON tramos FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_full_tramos" 
  ON tramos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_read_tramos" 
  ON tramos FOR SELECT TO anon USING (activo = true);
