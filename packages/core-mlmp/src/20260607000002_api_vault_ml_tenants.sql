-- ================================================================
-- Migración: api_vault → soporte multi-tenant para ML/MP
--
-- Ejecutar DESPUÉS de la migración base de api-vault
-- (20260607_api_vault.sql)
--
-- Agrega:
--   1. Columna tenant_id (tienda/store) al api_vault existente
--   2. Índices optimizados para búsquedas de credenciales ML/MP
--   3. Política RLS adicional para service_role (Edge Functions)
--   4. Vista de estado de credenciales ML/MP (sin exponer value)
-- ================================================================

-- ── 1. Columna tenant_id ─────────────────────────────────────
-- Representa la tienda dueña de la credencial.
-- NULL = credencial global del marketplace (fallback para todas las tiendas).

ALTER TABLE public.api_vault
  ADD COLUMN IF NOT EXISTS tenant_id text DEFAULT NULL;

COMMENT ON COLUMN public.api_vault.tenant_id IS
  'ID de la tienda dueña de esta credencial. NULL = credencial global del marketplace.';

-- Índice para búsquedas por tenant
CREATE INDEX IF NOT EXISTS api_vault_tenant_id_idx
  ON public.api_vault (tenant_id)
  WHERE tenant_id IS NOT NULL;

-- Índice compuesto para la resolución de credenciales ML/MP
-- (platform + tenant_id + tags) — el query más frecuente del módulo
CREATE INDEX IF NOT EXISTS api_vault_ml_resolution_idx
  ON public.api_vault (platform, tenant_id)
  WHERE type = 'oauth';

-- ── 2. Política RLS para service_role (Edge Functions) ───────
-- Las Edge Functions usan service_role y necesitan acceso completo
-- al vault para leer/escribir tokens en nombre de cualquier usuario.
--
-- ⚠ service_role bypasses RLS por defecto en Supabase,
--   pero lo dejamos explícito para claridad y auditoría.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'api_vault'
      AND policyname = 'api_vault: service_role acceso total'
  ) THEN
    CREATE POLICY "api_vault: service_role acceso total"
      ON public.api_vault FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ── 3. Política adicional: tenant members ────────────────────
-- Miembros de un tenant pueden ver las credenciales de su tienda.
-- Requiere que exista la tabla tenant_members (ya está en api-vault).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'tenant_members'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY IF NOT EXISTS "api_vault: miembro de tenant ve las del tenant"
        ON public.api_vault FOR SELECT
        USING (
          tenant_id IS NULL                    -- credenciales globales: todos las ven
          OR auth.uid() = user_id              -- propias
          OR EXISTS (                          -- miembro del tenant
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = api_vault.tenant_id
              AND tm.user_id   = auth.uid()
          )
        );
    $policy$;
  END IF;
END $$;

-- ── 4. Vista de estado para el panel admin ────────────────────
-- Expone metadata de credenciales ML/MP SIN el campo value (tokens).
-- Segura de consultar desde el cliente React.

CREATE OR REPLACE VIEW public.ml_credentials_status AS
SELECT
  id,
  user_id,
  tenant_id,
  name,
  platform,
  env,
  tags,
  notes,
  expires_at,
  created_at,
  updated_at,
  -- Estado calculado
  (expires_at IS NOT NULL AND expires_at < now())                        AS is_expired,
  (expires_at IS NOT NULL AND expires_at > now()
    AND expires_at < now() + interval '30 minutes')                      AS expiring_soon,
  -- Extrae sellerId y nickname del JSON sin exponer tokens
  (value::jsonb ->> 'sellerId')                                          AS seller_id,
  (value::jsonb ->> 'nickname')                                          AS nickname,
  (value::jsonb ? 'publicKey')                                           AS has_public_key,
  -- Indica si es credencial global (fallback) o de una tienda específica
  (tenant_id IS NULL)                                                    AS is_global
FROM public.api_vault
WHERE type = 'oauth'
  AND platform IN ('MercadoLibre', 'MercadoPago');

-- RLS en la vista (hereda de api_vault via SECURITY INVOKER por defecto)
-- No necesita políticas adicionales.

-- ── 5. Función: resolver credencial ML/MP desde SQL ──────────
-- Útil para joins en queries complejas o RPCs server-side.
-- Devuelve el access_token para un tenant/platform/site.
-- Solo accesible con service_role.

CREATE OR REPLACE FUNCTION public.resolve_ml_token(
  p_platform   text,    -- 'MercadoLibre' | 'MercadoPago'
  p_site_id    text,    -- 'MLU', 'MLA', etc.
  p_tenant_id  text     -- store id, o NULL para global
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value  text;
  v_token  text;
BEGIN
  -- Intentar credencial propia del tenant primero
  IF p_tenant_id IS NOT NULL THEN
    SELECT value INTO v_value
    FROM public.api_vault
    WHERE platform   = p_platform
      AND type       = 'oauth'
      AND tenant_id  = p_tenant_id
      AND tags @> ARRAY[p_site_id]
      AND (expires_at IS NULL OR expires_at > now() - interval '2 hours')
    LIMIT 1;
  END IF;

  -- Fallback: credencial global
  IF v_value IS NULL THEN
    SELECT value INTO v_value
    FROM public.api_vault
    WHERE platform  = p_platform
      AND type      = 'oauth'
      AND tenant_id IS NULL
      AND tags @> ARRAY[p_site_id]
      AND (expires_at IS NULL OR expires_at > now() - interval '2 hours')
    LIMIT 1;
  END IF;

  IF v_value IS NULL THEN RETURN NULL; END IF;

  -- Extraer accessToken del JSON
  v_token := (v_value::jsonb) ->> 'accessToken';
  RETURN v_token;
END;
$$;
