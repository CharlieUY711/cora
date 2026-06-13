-- Registro de integraciones configuradas
CREATE TABLE integraciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,           -- 'mercadopago' | 'mercadolibre' | 'whatsapp' | etc
  tipo TEXT NOT NULL,             -- 'pagos' | 'marketplace' | 'comunicacion' | 'logistica' | 'identidad' | 'analytics'
  proveedor TEXT NOT NULL,        -- nombre del proveedor externo
  estado TEXT NOT NULL DEFAULT 'inactivo',  -- 'activo' | 'inactivo' | 'error' | 'configurando'
  config JSONB DEFAULT '{}',      -- credenciales y config (encriptado en producción)
  webhook_url TEXT,               -- URL de webhook si aplica
  ultimo_ping TIMESTAMPTZ,
  ultimo_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log de eventos por integración
CREATE TABLE integraciones_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integracion_id UUID REFERENCES integraciones(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,             -- 'conexion' | 'error' | 'webhook' | 'sync'
  nivel TEXT NOT NULL DEFAULT 'info',  -- 'info' | 'warning' | 'error'
  mensaje TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys para dar acceso a terceros
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  key_hash TEXT NOT NULL UNIQUE,  -- hash de la key real
  key_prefix TEXT NOT NULL,       -- primeros 8 chars para identificar (ej: 'ck_live_')
  permisos JSONB DEFAULT '[]',    -- array de permisos: ['read:pedidos', 'write:productos']
  estado TEXT NOT NULL DEFAULT 'activo',
  expira_en TIMESTAMPTZ,
  ultimo_uso TIMESTAMPTZ,
  usos_totales INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhooks para recibir eventos externos
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  url TEXT NOT NULL,
  eventos JSONB DEFAULT '[]',     -- ['pedido.creado', 'pago.confirmado']
  estado TEXT NOT NULL DEFAULT 'activo',
  secret TEXT,                    -- para verificar firma
  ultimo_intento TIMESTAMPTZ,
  ultimo_status INTEGER,          -- HTTP status del último intento
  intentos_fallidos INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_integraciones_tipo ON integraciones(tipo);
CREATE INDEX idx_integraciones_estado ON integraciones(estado);
CREATE INDEX idx_integraciones_logs_integracion ON integraciones_logs(integracion_id);
CREATE INDEX idx_api_keys_estado ON api_keys(estado);
CREATE INDEX idx_webhooks_estado ON webhooks(estado);

-- RLS
ALTER TABLE integraciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE integraciones_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON integraciones FOR ALL USING (true);
CREATE POLICY "service_role_all" ON integraciones_logs FOR ALL USING (true);
CREATE POLICY "service_role_all" ON api_keys FOR ALL USING (true);
CREATE POLICY "service_role_all" ON webhooks FOR ALL USING (true);

-- Seed: integraciones disponibles (inactivas por defecto)
INSERT INTO integraciones (nombre, tipo, proveedor, estado) VALUES
  ('mercadopago', 'pagos', 'MercadoPago', 'inactivo'),
  ('plexo', 'pagos', 'Plexo', 'inactivo'),
  ('mercadolibre', 'marketplace', 'Mercado Libre', 'inactivo'),
  ('whatsapp', 'comunicacion', 'WhatsApp Business (Twilio)', 'inactivo'),
  ('resend', 'comunicacion', 'Resend', 'inactivo'),
  ('gmail', 'comunicacion', 'Gmail / SMTP', 'inactivo'),
  ('meta', 'comunicacion', 'Meta (Facebook/Instagram)', 'inactivo'),
  ('twilio', 'comunicacion', 'Twilio SMS', 'inactivo'),
  ('google_maps', 'logistica', 'Google Maps', 'inactivo'),
  ('metamap', 'identidad', 'MetaMap (KYC)', 'inactivo'),
  ('google_analytics', 'analytics', 'Google Analytics', 'inactivo');
