-- ═══════════════════════════════════════════════════════════════════════════════
-- Crear Tabla de Métodos de Pago (si no existe)
-- Proyecto: qhnmxvexkizcsmivfuam
-- ═══════════════════════════════════════════════════════════════════════════════

-- Crear la tabla si no existe
CREATE TABLE IF NOT EXISTS metodos_pago (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          text NOT NULL,
  tipo            text NOT NULL CHECK (tipo IN ('pasarela', 'transferencia', 'efectivo', 'credito', 'otro')),
  proveedor       text,
  descripcion     text,
  instrucciones   text,
  activo          boolean NOT NULL DEFAULT true,
  orden           integer NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Crear índice para búsquedas por activo y orden
CREATE INDEX IF NOT EXISTS idx_metodos_pago_activo ON metodos_pago(activo);
CREATE INDEX IF NOT EXISTS idx_metodos_pago_orden ON metodos_pago(orden);
CREATE INDEX IF NOT EXISTS idx_metodos_pago_tipo ON metodos_pago(tipo);

-- Habilitar RLS (Row Level Security)
ALTER TABLE metodos_pago ENABLE ROW LEVEL SECURITY;

-- Política para service_role (permite todas las operaciones)
DROP POLICY IF EXISTS "service_role_metodos_pago" ON metodos_pago;
CREATE POLICY "service_role_metodos_pago" 
  ON metodos_pago 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Política para usuarios autenticados (solo lectura)
DROP POLICY IF EXISTS "authenticated_read_metodos_pago" ON metodos_pago;
CREATE POLICY "authenticated_read_metodos_pago" 
  ON metodos_pago 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Comentarios en la tabla
COMMENT ON TABLE metodos_pago IS 'Métodos de pago disponibles para el checkout';
COMMENT ON COLUMN metodos_pago.tipo IS 'Tipo de método: pasarela, transferencia, efectivo, credito, otro';
COMMENT ON COLUMN metodos_pago.proveedor IS 'Proveedor del método (mercadopago, stripe, paypal, etc.)';
COMMENT ON COLUMN metodos_pago.activo IS 'Si el método está activo y visible en el checkout';
COMMENT ON COLUMN metodos_pago.orden IS 'Orden de visualización en el checkout';
