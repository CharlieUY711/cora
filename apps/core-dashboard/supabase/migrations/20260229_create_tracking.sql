-- Tracking: Envíos y Eventos
CREATE TABLE IF NOT EXISTS tracking_envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  numero TEXT,
  tracking_externo TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'creado', 'despachado', 'en_transito', 'en_deposito', 'en_reparto', 'entregado', 'fallido')),
  estado_tipo TEXT DEFAULT 'creado' CHECK (estado_tipo IN ('creado', 'despachado', 'en_transito', 'en_deposito', 'en_reparto', 'entregado', 'fallido')),
  origen TEXT,
  destino TEXT,
  destinatario TEXT,
  carrier TEXT,
  peso TEXT,
  fecha_estimada TEXT,
  envio_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tracking_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id UUID REFERENCES tracking_envios(id) ON DELETE CASCADE,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hora TEXT,
  descripcion TEXT NOT NULL,
  lugar TEXT,
  ubicacion TEXT,
  tipo TEXT DEFAULT 'info' CHECK (tipo IN ('info', 'alerta', 'entregado', 'creado', 'despachado', 'en_transito', 'en_deposito', 'en_reparto', 'entregado', 'fallido')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_envios_codigo ON tracking_envios(codigo);
CREATE INDEX IF NOT EXISTS idx_tracking_envios_estado ON tracking_envios(estado);
CREATE INDEX IF NOT EXISTS idx_tracking_eventos_tracking_id ON tracking_eventos(tracking_id);

ALTER TABLE tracking_envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_eventos ENABLE ROW LEVEL SECURITY;

-- RLS Policies para tracking_envios
CREATE POLICY "service_role_tracking_envios" 
  ON tracking_envios FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_tracking_envios" 
  ON tracking_envios FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_full_tracking_envios" 
  ON tracking_envios FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_read_tracking_envios" 
  ON tracking_envios FOR SELECT TO anon USING (true);

-- RLS Policies para tracking_eventos
CREATE POLICY "service_role_tracking_eventos" 
  ON tracking_eventos FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_tracking_eventos" 
  ON tracking_eventos FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_full_tracking_eventos" 
  ON tracking_eventos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_read_tracking_eventos" 
  ON tracking_eventos FOR SELECT TO anon USING (true);
