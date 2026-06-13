-- Abastecimiento: Alertas, Órdenes de Compra y MRP
CREATE TABLE IF NOT EXISTS abastecimiento_alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('stock_bajo', 'ruptura', 'sobrestock')),
  producto TEXT NOT NULL,
  sku TEXT,
  categoria TEXT,
  nivel TEXT NOT NULL CHECK (nivel IN ('info', 'warning', 'critical')),
  valor NUMERIC,
  umbral NUMERIC,
  stock_actual NUMERIC DEFAULT 0,
  stock_minimo NUMERIC DEFAULT 0,
  stock_optimo NUMERIC DEFAULT 0,
  unidad TEXT,
  proveedor TEXT,
  tiempo_reposicion INTEGER,
  consumo_prom_diario NUMERIC,
  dias_restantes INTEGER,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS abastecimiento_ordenes_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor TEXT NOT NULL,
  producto TEXT NOT NULL,
  sku TEXT,
  cantidad_sugerida INTEGER,
  precio_estimado NUMERIC,
  precio_unit NUMERIC,
  total NUMERIC,
  motivo_oc TEXT,
  urgencia TEXT DEFAULT 'normal' CHECK (urgencia IN ('baja', 'normal', 'alta')),
  estado TEXT DEFAULT 'sugerida' CHECK (estado IN ('sugerida', 'aprobada', 'enviada', 'recibida', 'cancelada')),
  fecha_sugerida TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS abastecimiento_mrp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  componente TEXT NOT NULL,
  sku TEXT,
  unidad TEXT,
  stock_actual NUMERIC DEFAULT 0,
  demanda_proyectada NUMERIC DEFAULT 0,
  necesario NUMERIC DEFAULT 0,
  a_comprar NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abastecimiento_alertas_activa ON abastecimiento_alertas(activa);
CREATE INDEX IF NOT EXISTS idx_abastecimiento_alertas_nivel ON abastecimiento_alertas(nivel);
CREATE INDEX IF NOT EXISTS idx_abastecimiento_oc_estado ON abastecimiento_ordenes_compra(estado);

ALTER TABLE abastecimiento_alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE abastecimiento_ordenes_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE abastecimiento_mrp ENABLE ROW LEVEL SECURITY;

-- RLS Policies para abastecimiento_alertas
CREATE POLICY "service_role_abastecimiento_alertas" 
  ON abastecimiento_alertas FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_abastecimiento_alertas" 
  ON abastecimiento_alertas FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_full_abastecimiento_alertas" 
  ON abastecimiento_alertas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_read_abastecimiento_alertas" 
  ON abastecimiento_alertas FOR SELECT TO anon USING (activa = true);

-- RLS Policies para abastecimiento_ordenes_compra
CREATE POLICY "service_role_abastecimiento_oc" 
  ON abastecimiento_ordenes_compra FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_abastecimiento_oc" 
  ON abastecimiento_ordenes_compra FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_full_abastecimiento_oc" 
  ON abastecimiento_ordenes_compra FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_read_abastecimiento_oc" 
  ON abastecimiento_ordenes_compra FOR SELECT TO anon USING (true);

-- RLS Policies para abastecimiento_mrp
CREATE POLICY "service_role_abastecimiento_mrp" 
  ON abastecimiento_mrp FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_abastecimiento_mrp" 
  ON abastecimiento_mrp FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_full_abastecimiento_mrp" 
  ON abastecimiento_mrp FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_read_abastecimiento_mrp" 
  ON abastecimiento_mrp FOR SELECT TO anon USING (true);
