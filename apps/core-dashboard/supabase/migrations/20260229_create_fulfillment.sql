-- Fulfillment: Órdenes y Waves
CREATE TABLE IF NOT EXISTS fulfillment_ordenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_externa_id TEXT,
  numero TEXT UNIQUE,
  pedido TEXT,
  cliente TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_picking', 'listo_empacar', 'empacado', 'despachado')),
  prioridad TEXT DEFAULT 'normal' CHECK (prioridad IN ('urgente', 'alta', 'normal', 'baja')),
  items INTEGER DEFAULT 0,
  peso NUMERIC,
  volumen NUMERIC,
  zona TEXT,
  wave_id UUID,
  operario TEXT,
  tiempo_estimado TEXT,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  observaciones TEXT,
  lineas JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fulfillment_waves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('abierta', 'en_proceso', 'completada')),
  operarios INTEGER DEFAULT 0,
  ordenes JSONB DEFAULT '[]'::jsonb,
  inicio TIMESTAMPTZ,
  fin TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fulfillment_ordenes_estado ON fulfillment_ordenes(estado);
CREATE INDEX IF NOT EXISTS idx_fulfillment_ordenes_wave_id ON fulfillment_ordenes(wave_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_waves_estado ON fulfillment_waves(estado);

ALTER TABLE fulfillment_ordenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fulfillment_waves ENABLE ROW LEVEL SECURITY;

-- RLS Policies para fulfillment_ordenes
CREATE POLICY "service_role_fulfillment_ordenes" 
  ON fulfillment_ordenes FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_fulfillment_ordenes" 
  ON fulfillment_ordenes FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_full_fulfillment_ordenes" 
  ON fulfillment_ordenes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_read_fulfillment_ordenes" 
  ON fulfillment_ordenes FOR SELECT TO anon USING (true);

-- RLS Policies para fulfillment_waves
CREATE POLICY "service_role_fulfillment_waves" 
  ON fulfillment_waves FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_fulfillment_waves" 
  ON fulfillment_waves FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_full_fulfillment_waves" 
  ON fulfillment_waves FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_read_fulfillment_waves" 
  ON fulfillment_waves FOR SELECT TO anon USING (true);
