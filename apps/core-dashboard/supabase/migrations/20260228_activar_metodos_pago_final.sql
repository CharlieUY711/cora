CREATE TABLE IF NOT EXISTS metodos_pago (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('pasarela', 'transferencia', 'efectivo', 'credito', 'otro')),
  proveedor text,
  descripcion text,
  instrucciones text,
  activo boolean NOT NULL DEFAULT true,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_metodos_pago_activo ON metodos_pago(activo);
CREATE INDEX IF NOT EXISTS idx_metodos_pago_orden ON metodos_pago(orden);
CREATE INDEX IF NOT EXISTS idx_metodos_pago_tipo ON metodos_pago(tipo);

ALTER TABLE metodos_pago ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_metodos_pago" ON metodos_pago;
CREATE POLICY "service_role_metodos_pago" ON metodos_pago FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_metodos_pago" ON metodos_pago;
CREATE POLICY "authenticated_read_metodos_pago" ON metodos_pago FOR SELECT TO authenticated USING (true);

UPDATE metodos_pago SET activo = true WHERE activo = false;
UPDATE metodos_pago SET updated_at = now() WHERE activo = true;

INSERT INTO metodos_pago (nombre, tipo, proveedor, descripcion, instrucciones, activo, orden)
SELECT 'MercadoPago', 'pasarela', 'mercadopago', 
       'Pagá con tarjeta, dinero en cuenta o efectivo vía MercadoPago',
       E'💳 Comisión: 5.99%\nSerás redirigido al sitio de MercadoPago para completar tu pago de forma segura.',
       true, 1
WHERE NOT EXISTS (SELECT 1 FROM metodos_pago WHERE nombre = 'MercadoPago');

INSERT INTO metodos_pago (nombre, tipo, proveedor, descripcion, instrucciones, activo, orden)
SELECT 'Stripe', 'pasarela', 'stripe',
       'Tarjeta de crédito/débito internacional vía Stripe',
       E'💳 Comisión: 2.9%\nPagá de forma segura con tu tarjeta Visa, Mastercard o American Express.',
       true, 2
WHERE NOT EXISTS (SELECT 1 FROM metodos_pago WHERE nombre = 'Stripe');

INSERT INTO metodos_pago (nombre, tipo, proveedor, descripcion, instrucciones, activo, orden)
SELECT 'PayPal', 'pasarela', 'paypal',
       'Pago internacional vía cuenta PayPal',
       E'💳 Comisión: 3.4%\nSerás redirigido a PayPal para completar tu pago.',
       true, 3
WHERE NOT EXISTS (SELECT 1 FROM metodos_pago WHERE nombre = 'PayPal');

INSERT INTO metodos_pago (nombre, tipo, proveedor, descripcion, instrucciones, activo, orden)
SELECT 'Transferencia Bancaria', 'transferencia', NULL,
       'Transferencia directa a cuenta bancaria',
       E'Banco: \nCBU/CVU: \nAlias: \nTitular: \n\nEnviá el comprobante por WhatsApp al confirmar el pedido.',
       true, 4
WHERE NOT EXISTS (SELECT 1 FROM metodos_pago WHERE nombre = 'Transferencia Bancaria');

INSERT INTO metodos_pago (nombre, tipo, proveedor, descripcion, instrucciones, activo, orden)
SELECT 'Abitab', 'efectivo', 'abitab',
       'Pago en efectivo en cualquier local Abitab del país',
       'Al confirmar tu pedido recibirás el número de operación para abonar en cualquier local Abitab.',
       true, 5
WHERE NOT EXISTS (SELECT 1 FROM metodos_pago WHERE nombre = 'Abitab');

INSERT INTO metodos_pago (nombre, tipo, proveedor, descripcion, instrucciones, activo, orden)
SELECT 'RedPagos', 'efectivo', 'redpagos',
       'Pago en efectivo en locales RedPagos',
       'Al confirmar tu pedido recibirás el código para abonar en cualquier local RedPagos.',
       true, 6
WHERE NOT EXISTS (SELECT 1 FROM metodos_pago WHERE nombre = 'RedPagos');

INSERT INTO metodos_pago (nombre, tipo, proveedor, descripcion, instrucciones, activo, orden)
SELECT 'Efectivo contra entrega', 'efectivo', NULL,
       'Pagás en efectivo al recibir el pedido',
       'Por favor tener el monto exacto preparado al momento de la entrega.',
       true, 7
WHERE NOT EXISTS (SELECT 1 FROM metodos_pago WHERE nombre = 'Efectivo contra entrega');

SELECT 
  COUNT(*) as total_metodos,
  COUNT(*) FILTER (WHERE activo = true) as metodos_activos,
  COUNT(*) FILTER (WHERE activo = false) as metodos_inactivos
FROM metodos_pago;
