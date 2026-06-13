-- ── MARKETING & RRSS ──────────────────────────────────────────────
-- Migración completa: Marketing, Redes Sociales, Fidelización y Sorteos
-- Fecha: 2026-02-29

-- ── RRSS ──────────────────────────────────────────────

-- Credenciales de plataformas (reemplaza KV store)
CREATE TABLE IF NOT EXISTS rrss_credenciales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL UNIQUE,   -- 'instagram' | 'facebook' | 'whatsapp'
  app_id TEXT,
  app_secret TEXT,
  token TEXT,
  account_id TEXT,
  page_id TEXT,
  verified BOOLEAN DEFAULT FALSE,
  account_name TEXT,
  verified_at TIMESTAMPTZ,
  verify_error TEXT,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts/publicaciones programadas y publicadas
CREATE TABLE IF NOT EXISTS rrss_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,          -- 'facebook' | 'instagram' | 'whatsapp'
  tipo TEXT NOT NULL DEFAULT 'post', -- 'post' | 'story' | 'reel' | 'broadcast'
  contenido TEXT,
  imagen_url TEXT,
  estado TEXT NOT NULL DEFAULT 'borrador', -- 'borrador' | 'programado' | 'publicado' | 'error'
  programado_para TIMESTAMPTZ,
  publicado_en TIMESTAMPTZ,
  external_id TEXT,                -- ID del post en la plataforma externa
  likes INTEGER DEFAULT 0,
  alcance INTEGER DEFAULT 0,
  comentarios INTEGER DEFAULT 0,
  error_msg TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Métricas históricas por plataforma
CREATE TABLE IF NOT EXISTS rrss_metricas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  fecha DATE NOT NULL,
  seguidores INTEGER DEFAULT 0,
  alcance INTEGER DEFAULT 0,
  engagement NUMERIC DEFAULT 0,
  impresiones INTEGER DEFAULT 0,
  nuevos_seguidores INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, fecha)
);

-- ── MARKETING ─────────────────────────────────────────

-- Campañas de email (Resend)
CREATE TABLE IF NOT EXISTS marketing_campanas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  asunto TEXT,
  contenido_html TEXT,
  estado TEXT NOT NULL DEFAULT 'borrador', -- 'borrador' | 'programada' | 'enviada' | 'pausada'
  tipo TEXT DEFAULT 'email',       -- 'email' | 'whatsapp' | 'push'
  segmento JSONB DEFAULT '{}',     -- filtros de audiencia
  programada_para TIMESTAMPTZ,
  enviada_en TIMESTAMPTZ,
  total_destinatarios INTEGER DEFAULT 0,
  total_enviados INTEGER DEFAULT 0,
  total_abiertos INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_rebotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suscriptores de email
CREATE TABLE IF NOT EXISTS marketing_suscriptores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  nombre TEXT,
  estado TEXT NOT NULL DEFAULT 'activo', -- 'activo' | 'inactivo' | 'rebotado' | 'cancelado'
  tags JSONB DEFAULT '[]',
  fuente TEXT,                     -- 'checkout' | 'formulario' | 'importado'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Programa de fidelización
CREATE TABLE IF NOT EXISTS fidelizacion_niveles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,            -- 'Bronce' | 'Plata' | 'Oro' | 'Platino'
  puntos_minimos INTEGER NOT NULL,
  color TEXT,
  beneficios JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fidelizacion_miembros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID,                 -- referencia a tabla personas
  email TEXT NOT NULL,
  nombre TEXT,
  nivel_id UUID REFERENCES fidelizacion_niveles(id),
  puntos_actuales INTEGER DEFAULT 0,
  puntos_historicos INTEGER DEFAULT 0,
  estado TEXT DEFAULT 'activo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fidelizacion_movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  miembro_id UUID REFERENCES fidelizacion_miembros(id),
  tipo TEXT NOT NULL,              -- 'suma' | 'resta' | 'canje'
  puntos INTEGER NOT NULL,
  descripcion TEXT,
  referencia_id TEXT,              -- ID de pedido u otra referencia
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sorteos
CREATE TABLE IF NOT EXISTS sorteos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  premio TEXT,
  estado TEXT NOT NULL DEFAULT 'borrador', -- 'borrador' | 'activo' | 'finalizado'
  inicio TIMESTAMPTZ,
  fin TIMESTAMPTZ,
  total_participantes INTEGER DEFAULT 0,
  ganador_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sorteos_participantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sorteo_id UUID REFERENCES sorteos(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_rrss_posts_platform ON rrss_posts(platform);
CREATE INDEX IF NOT EXISTS idx_rrss_posts_estado ON rrss_posts(estado);
CREATE INDEX IF NOT EXISTS idx_rrss_metricas_platform_fecha ON rrss_metricas(platform, fecha);
CREATE INDEX IF NOT EXISTS idx_marketing_campanas_estado ON marketing_campanas(estado);
CREATE INDEX IF NOT EXISTS idx_marketing_suscriptores_estado ON marketing_suscriptores(estado);
CREATE INDEX IF NOT EXISTS idx_fidelizacion_miembros_nivel ON fidelizacion_miembros(nivel_id);
CREATE INDEX IF NOT EXISTS idx_sorteos_estado ON sorteos(estado);

-- RLS
ALTER TABLE rrss_credenciales ENABLE ROW LEVEL SECURITY;
ALTER TABLE rrss_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rrss_metricas ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campanas ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_suscriptores ENABLE ROW LEVEL SECURITY;
ALTER TABLE fidelizacion_niveles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fidelizacion_miembros ENABLE ROW LEVEL SECURITY;
ALTER TABLE fidelizacion_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sorteos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sorteos_participantes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: service_role tiene acceso completo
DROP POLICY IF EXISTS "service_role_all" ON rrss_credenciales;
DROP POLICY IF EXISTS "service_role_all" ON rrss_posts;
DROP POLICY IF EXISTS "service_role_all" ON rrss_metricas;
DROP POLICY IF EXISTS "service_role_all" ON marketing_campanas;
DROP POLICY IF EXISTS "service_role_all" ON marketing_suscriptores;
DROP POLICY IF EXISTS "service_role_all" ON fidelizacion_niveles;
DROP POLICY IF EXISTS "service_role_all" ON fidelizacion_miembros;
DROP POLICY IF EXISTS "service_role_all" ON fidelizacion_movimientos;
DROP POLICY IF EXISTS "service_role_all" ON sorteos;
DROP POLICY IF EXISTS "service_role_all" ON sorteos_participantes;

CREATE POLICY "service_role_all" ON rrss_credenciales FOR ALL USING (true);
CREATE POLICY "service_role_all" ON rrss_posts FOR ALL USING (true);
CREATE POLICY "service_role_all" ON rrss_metricas FOR ALL USING (true);
CREATE POLICY "service_role_all" ON marketing_campanas FOR ALL USING (true);
CREATE POLICY "service_role_all" ON marketing_suscriptores FOR ALL USING (true);
CREATE POLICY "service_role_all" ON fidelizacion_niveles FOR ALL USING (true);
CREATE POLICY "service_role_all" ON fidelizacion_miembros FOR ALL USING (true);
CREATE POLICY "service_role_all" ON fidelizacion_movimientos FOR ALL USING (true);
CREATE POLICY "service_role_all" ON sorteos FOR ALL USING (true);
CREATE POLICY "service_role_all" ON sorteos_participantes FOR ALL USING (true);

-- Seed: niveles de fidelización
INSERT INTO fidelizacion_niveles (nombre, puntos_minimos, color, beneficios) VALUES
  ('Bronce', 0,    '#CD7F32', '["Acumulación de puntos", "Descuentos básicos"]'::jsonb),
  ('Plata',  500,  '#C0C0C0', '["5% descuento", "Envío gratis en compras +$1000"]'::jsonb),
  ('Oro',    2000, '#FFD700', '["10% descuento", "Envío gratis siempre", "Acceso anticipado"]'::jsonb),
  ('Platino',5000, '#E5E4E2', '["15% descuento", "Envío express gratis", "Soporte prioritario", "Acceso VIP"]'::jsonb)
ON CONFLICT DO NOTHING;
