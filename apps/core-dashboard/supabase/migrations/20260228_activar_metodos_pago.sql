-- ==============================================================================
-- Activar Métodos de Pago
-- Proyecto: qhnmxvexkizcsmivfuam
-- ==============================================================================

-- Paso 0: Crear la tabla si no existe
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

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_metodos_pago_activo ON metodos_pago(activo);
CREATE INDEX IF NOT EXISTS idx_metodos_pago_orden ON metodos_pago(orden);
CREATE INDEX IF NOT EXISTS idx_metodos_pago_tipo ON metodos_pago(tipo);

-- Habilitar RLS si no está habilitado
ALTER TABLE metodos_pago ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "service_role_metodos_pago" ON metodos_pago;
CREATE POLICY "service_role_metodos_pago" 
  ON metodos_pago 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_metodos_pago" ON metodos_pago;
CREATE POLICY "authenticated_read_metodos_pago" 
  ON metodos_pago 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Paso 1: Activar todos los métodos de pago existentes
DO $$
BEGIN
  -- Verificar si la tabla existe antes de actualizar
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'metodos_pago') THEN
    UPDATE metodos_pago 
    SET activo = true
    WHERE activo = false;
    
    -- Actualizar updated_at si la columna existe
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'metodos_pago' AND column_name = 'updated_at'
    ) THEN
      UPDATE metodos_pago 
      SET updated_at = now()
      WHERE activo = true;
    END IF;
  END IF;
END $$;

-- Paso 2: Si no hay métodos de pago, crear los métodos básicos
DO $$
DECLARE
  metodos_count int;
BEGIN
  -- Verificar si la tabla existe
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'metodos_pago') THEN
    RAISE NOTICE 'La tabla metodos_pago no existe. Por favor, créala primero.';
    RETURN;
  END IF;

  -- Verificar si hay métodos de pago
  SELECT COUNT(*) INTO metodos_count FROM metodos_pago;
  
  -- Si no hay métodos, crear los básicos
  IF metodos_count = 0 THEN
    -- MercadoPago
    INSERT INTO metodos_pago (nombre, tipo, proveedor, descripcion, instrucciones, activo, orden)
    VALUES (
      'MercadoPago',
      'pasarela',
      'mercadopago',
      'Pagá con tarjeta, dinero en cuenta o efectivo vía MercadoPago',
      E'💳 Comisión: 5.99%\nSerás redirigido al sitio de MercadoPago para completar tu pago de forma segura.',
      true,
      1
    );

    -- Stripe
    INSERT INTO metodos_pago (nombre, tipo, proveedor, descripcion, instrucciones, activo, orden)
    VALUES (
      'Stripe',
      'pasarela',
      'stripe',
      'Tarjeta de crédito/débito internacional vía Stripe',
      E'💳 Comisión: 2.9%\nPagá de forma segura con tu tarjeta Visa, Mastercard o American Express.',
      true,
      2
    );

    -- PayPal
    INSERT INTO metodos_pago (nombre, tipo, proveedor, descripcion, instrucciones, activo, orden)
    VALUES (
      'PayPal',
      'pasarela',
      'paypal',
      'Pago internacional vía cuenta PayPal',
      E'💳 Comisión: 3.4%\nSerás redirigido a PayPal para completar tu pago.',
      true,
      3
    );

    -- Transferencia Bancaria
    INSERT INTO metodos_pago (nombre, tipo, proveedor, descripcion, instrucciones, activo, orden)
    VALUES (
      'Transferencia Bancaria',
      'transferencia',
      NULL,
      'Transferencia directa a cuenta bancaria',
      E'Banco: \nCBU/CVU: \nAlias: \nTitular: \n\nEnviá el comprobante por WhatsApp al confirmar el pedido.',
      true,
      4
    );

    -- Abitab
    INSERT INTO metodos_pago (nombre, tipo, proveedor, descripcion, instrucciones, activo, orden)
    VALUES (
      'Abitab',
      'efectivo',
      'abitab',
      'Pago en efectivo en cualquier local Abitab del país',
      'Al confirmar tu pedido recibirás el número de operación para abonar en cualquier local Abitab.',
      true,
      5
    );

    -- RedPagos
    INSERT INTO metodos_pago (nombre, tipo, proveedor, descripcion, instrucciones, activo, orden)
    VALUES (
      'RedPagos',
      'efectivo',
      'redpagos',
      'Pago en efectivo en locales RedPagos',
      'Al confirmar tu pedido recibirás el código para abonar en cualquier local RedPagos.',
      true,
      6
    );

    -- Efectivo contra entrega
    INSERT INTO metodos_pago (nombre, tipo, proveedor, descripcion, instrucciones, activo, orden)
    VALUES (
      'Efectivo contra entrega',
      'efectivo',
      NULL,
      'Pagás en efectivo al recibir el pedido',
      'Por favor tener el monto exacto preparado al momento de la entrega.',
      true,
      7
    );

    RAISE NOTICE 'Métodos de pago creados y activados';
  ELSE
    RAISE NOTICE 'Métodos de pago existentes activados: % métodos', metodos_count;
  END IF;
END $$;

-- Verificación final
DO $$
DECLARE
  total_metodos int;
  metodos_activos int;
  metodos_inactivos int;
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'metodos_pago') THEN
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE activo = true),
      COUNT(*) FILTER (WHERE activo = false)
    INTO total_metodos, metodos_activos, metodos_inactivos
    FROM metodos_pago;
    
    RAISE NOTICE '=== Resumen de Métodos de Pago ===';
    RAISE NOTICE 'Total: %, Activos: %, Inactivos: %', total_metodos, metodos_activos, metodos_inactivos;
  END IF;
END $$;
