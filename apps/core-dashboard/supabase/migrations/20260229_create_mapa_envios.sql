-- Mapa de Envíos: Puntos geográficos
CREATE TABLE IF NOT EXISTS mapa_envios_puntos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('origen', 'destino', 'hub', 'punto_entrega', 'deposito', 'en_transito', 'entregado', 'fallido', 'en_reparto')),
  nombre TEXT NOT NULL,
  numero TEXT,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  x NUMERIC,
  y NUMERIC,
  envios INTEGER DEFAULT 0,
  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  cliente TEXT,
  carrier TEXT,
  localidad TEXT,
  provincia TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mapa_envios_puntos_tipo ON mapa_envios_puntos(tipo);
CREATE INDEX IF NOT EXISTS idx_mapa_envios_puntos_estado ON mapa_envios_puntos(estado);

ALTER TABLE mapa_envios_puntos ENABLE ROW LEVEL SECURITY;

-- RLS Policies para mapa_envios_puntos
CREATE POLICY "service_role_mapa_envios_puntos" 
  ON mapa_envios_puntos FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_mapa_envios_puntos" 
  ON mapa_envios_puntos FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_full_mapa_envios_puntos" 
  ON mapa_envios_puntos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_read_mapa_envios_puntos" 
  ON mapa_envios_puntos FOR SELECT TO anon USING (estado = 'activo');
