-- ═══════════════════════════════════════════════════════════════════════════════
-- Asegurar que la tabla envios existe y está correctamente configurada
-- ═══════════════════════════════════════════════════════════════════════════════

-- Crear función para actualizar updated_at si no existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear tabla envios si no existe
CREATE TABLE IF NOT EXISTS envios (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero          text NOT NULL UNIQUE,
  pedido_madre_id uuid,
  pedido_id       uuid,
  numero_pedido   text,
  
  -- Estado y tracking
  estado          text NOT NULL DEFAULT 'creado'
                  CHECK (estado IN ('creado','despachado','en_transito','en_deposito','en_reparto','entregado','fallido','devuelto','pendiente','preparando','en_camino','cancelado')),
  tracking        text,
  tracking_number text,
  
  -- Origen y destino
  origen          text,
  destino         text,
  destinatario    text,
  telefono        text,
  email           text,
  
  -- Geocodificación
  lat_origen      numeric(10, 8),
  lng_origen      numeric(11, 8),
  lat_destino     numeric(10, 8),
  lng_destino     numeric(11, 8),
  
  -- Carrier y tramo
  carrier         text,
  tramo           text DEFAULT 'local'
                  CHECK (tramo IN ('local','intercity','internacional','last_mile')),
  
  -- Multi-tramo
  es_multi_tramo  boolean DEFAULT false,
  tramos          jsonb,
  
  -- Dimensiones y peso
  peso            numeric(10, 2) DEFAULT 0,
  bultos          int DEFAULT 1,
  volumen         numeric(10, 2),
  
  -- Fechas
  fecha_creacion  timestamptz DEFAULT now(),
  fecha_despacho  timestamptz,
  fecha_estimada  date,
  fecha_entrega   timestamptz,
  
  -- Acuse de recibo
  acuse_recibido  boolean DEFAULT false,
  acuse_fecha     timestamptz,
  acuse_firmado_por text,
  acuse_firma_url text,
  acuse           jsonb,
  
  -- Eventos y tracking
  eventos         jsonb DEFAULT '[]',
  
  -- Notas y metadata
  notas           text,
  metadata        jsonb,
  
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Crear tabla envios_eventos si no existe
CREATE TABLE IF NOT EXISTS envios_eventos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  envio_id        uuid NOT NULL REFERENCES envios(id) ON DELETE CASCADE,
  estado          text NOT NULL,
  descripcion     text NOT NULL,
  ubicacion       text,
  lat             numeric(10, 8),
  lng             numeric(11, 8),
  fecha           timestamptz DEFAULT now(),
  origen          text DEFAULT 'sistema'
                  CHECK (origen IN ('sistema','carrier','manual')),
  created_at      timestamptz DEFAULT now()
);

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_envios_pedido_madre ON envios(pedido_madre_id);
CREATE INDEX IF NOT EXISTS idx_envios_pedido_id ON envios(pedido_id);
CREATE INDEX IF NOT EXISTS idx_envios_numero_pedido ON envios(numero_pedido);
CREATE INDEX IF NOT EXISTS idx_envios_estado ON envios(estado);
CREATE INDEX IF NOT EXISTS idx_envios_carrier ON envios(carrier);
CREATE INDEX IF NOT EXISTS idx_envios_tramo ON envios(tramo);
CREATE INDEX IF NOT EXISTS idx_envios_fecha_creacion ON envios(fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_envios_eventos_envio ON envios_eventos(envio_id);
CREATE INDEX IF NOT EXISTS idx_envios_eventos_fecha ON envios_eventos(fecha DESC);

-- Habilitar RLS
ALTER TABLE envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE envios_eventos ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para service_role
DROP POLICY IF EXISTS "service_role_envios" ON envios;
CREATE POLICY "service_role_envios" 
  ON envios 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_envios_eventos" ON envios_eventos;
CREATE POLICY "service_role_envios_eventos" 
  ON envios_eventos 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Crear políticas RLS para authenticated
DROP POLICY IF EXISTS "authenticated_read_envios" ON envios;
CREATE POLICY "authenticated_read_envios" 
  ON envios 
  FOR SELECT 
  TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "authenticated_full_envios" ON envios;
CREATE POLICY "authenticated_full_envios" 
  ON envios 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_envios_eventos" ON envios_eventos;
CREATE POLICY "authenticated_read_envios_eventos" 
  ON envios_eventos 
  FOR SELECT 
  TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "authenticated_full_envios_eventos" ON envios_eventos;
CREATE POLICY "authenticated_full_envios_eventos" 
  ON envios_eventos 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Crear trigger para updated_at
DROP TRIGGER IF EXISTS update_envios_updated_at ON envios;
CREATE TRIGGER update_envios_updated_at
  BEFORE UPDATE ON envios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verificar que las tablas se crearon correctamente
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'envios') THEN
    RAISE NOTICE '✓ Tabla envios creada correctamente';
  ELSE
    RAISE EXCEPTION '✗ Error: No se pudo crear la tabla envios';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'envios_eventos') THEN
    RAISE NOTICE '✓ Tabla envios_eventos creada correctamente';
  ELSE
    RAISE EXCEPTION '✗ Error: No se pudo crear la tabla envios_eventos';
  END IF;
END $$;
