-- =====================================================================
-- ml_sync: Migración para soporte completo de sincronización con ML
-- Ejecutar en: Supabase → SQL Editor
-- =====================================================================

-- 1. Agregar campos faltantes en productos_market
-- (se usan ADD COLUMN IF NOT EXISTS para ser idempotente)

ALTER TABLE public.productos_market
  ADD COLUMN IF NOT EXISTS ml_listing_type    text    DEFAULT 'gold_special',
  ADD COLUMN IF NOT EXISTS imagenes_adicionales text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ml_permalink       text;

-- 2. Asegurar que ml_sync_queue tiene onConflict para upsert
-- La constraint permite que sync_all no inserte duplicados

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'ml_sync_queue'
      AND constraint_name = 'ml_sync_queue_product_action_pending_uq'
  ) THEN
    -- Solo una entrada pendiente por producto+acción a la vez
    CREATE UNIQUE INDEX IF NOT EXISTS ml_sync_queue_product_action_pending_uq
      ON public.ml_sync_queue (product_id, action)
      WHERE status = 'pending';
  END IF;
END $$;

-- 3. Tabla ml_listings con upsert por product_id
ALTER TABLE public.ml_listings
  ADD COLUMN IF NOT EXISTS raw_response jsonb;

-- Constraint para upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'ml_listings'
      AND constraint_name = 'ml_listings_product_id_key'
  ) THEN
    ALTER TABLE public.ml_listings
      ADD CONSTRAINT ml_listings_product_id_key UNIQUE (product_id);
  END IF;
END $$;

-- 4. Agregar columna ml_order_id en orders si no existe
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ml_order_id text;

-- Índice para evitar duplicados de órdenes ML
CREATE UNIQUE INDEX IF NOT EXISTS orders_ml_order_id_uq
  ON public.orders (ml_order_id)
  WHERE ml_order_id IS NOT NULL;

-- 5. Vista admin_ml_errors: productos con sync_status = 'error' y ml_item_id
CREATE OR REPLACE VIEW public.admin_ml_errors AS
  SELECT
    pm.id           AS product_id,
    pm.nombre       AS product_name,
    pm.ml_item_id,
    pm.sync_status,
    sq.action       AS queue_action,
    sq.retries,
    sq.updated_at   AS last_error_at
  FROM public.productos_market pm
  LEFT JOIN (
    SELECT DISTINCT ON (product_id)
      product_id, action, retries, updated_at
    FROM public.ml_sync_queue
    WHERE status = 'error'
    ORDER BY product_id, updated_at DESC
  ) sq ON sq.product_id = pm.id
  WHERE pm.sync_status = 'error'
     OR sq.product_id IS NOT NULL;

-- 6. Función RPC: encolar sync de un producto
CREATE OR REPLACE FUNCTION public.admin_enqueue_ml_sync(
  p_product_id uuid,
  p_action     text DEFAULT 'sync_item'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.ml_sync_queue (product_id, action, status, retries)
  VALUES (p_product_id, p_action, 'pending', 0)
  ON CONFLICT DO NOTHING;
END;
$$;

-- 7. Función RPC: encolar sync de stock (alias de la anterior, compatibilidad)
CREATE OR REPLACE FUNCTION public.admin_publish_ml(
  p_product_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Encola sync_item completo (título + precio + stock + fotos)
  PERFORM public.admin_enqueue_ml_sync(p_product_id, 'sync_item');
END;
$$;

-- 8. Permisos
GRANT EXECUTE ON FUNCTION public.admin_enqueue_ml_sync(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_publish_ml(uuid) TO authenticated;
GRANT SELECT ON public.admin_ml_errors TO authenticated;
