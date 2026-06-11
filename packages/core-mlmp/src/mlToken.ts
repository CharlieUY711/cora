/**
 * supabase/functions/_shared/mlToken.ts
 *
 * Helper para todas las Edge Functions de core-market que necesiten
 * un token de MercadoLibre o MercadoPago.
 *
 * Reemplaza completamente el patrón anterior:
 *   ❌ const token = Deno.env.get('ML_ACCESS_TOKEN')!
 *
 * Por:
 *   ✅ const token = await getMLToken(supabase, { storeId, siteId })
 *   ✅ const token = await getMPToken(supabase, { storeId, siteId })
 *
 * Resolución automática:
 *   - Si la tienda tiene su propia cuenta en el vault → la usa
 *   - Si no → usa la cuenta global del marketplace
 *   - Si el token está próximo a vencer → lo refresca automáticamente
 *
 * No requiere cambios en las variables de entorno de las funciones existentes.
 * Solo necesita que ML_SECRETS_* estén configuradas (ver ml-oauth/index.ts).
 */

import { MLModule } from '../../src/MLModule.ts'
import type { MLSiteId, MLProvider } from '../../src/types/index.ts'

/**
 * Construye una instancia de MLModule con la config estándar de core-market.
 * Reutilizable en cualquier Edge Function.
 */
function buildMLModule(supabase: unknown) {
  const appId = Deno.env.get('APP_ID') ?? 'core-market'

  const getClientSecret = async (platform: MLProvider, siteId: MLSiteId): Promise<string> => {
    const isAppId    = String(siteId).startsWith('APP_ID_')
    const realSiteId = isAppId ? String(siteId).replace('APP_ID_', '') : String(siteId)
    const platformKey = platform.toUpperCase().replace(/\s/g, '')

    // Buscar: ML_SECRETS_MERCADOLIBRE_MLU → "app_id:client_secret"
    const envVal = Deno.env.get(`ML_SECRETS_${platformKey}_${realSiteId}`)
                ?? Deno.env.get(`ML_SECRETS_${realSiteId}`)

    if (!envVal) {
      throw new Error(
        `No está configurado ML_SECRETS_${platformKey}_${realSiteId} ` +
        `en las variables de entorno de Supabase Edge Functions.`
      )
    }

    const [appIdPart, secretPart] = envVal.split(':')
    return isAppId ? appIdPart : secretPart
  }

  return new MLModule({ supabase: supabase as any, appId, getClientSecret })
}

// ── API simplificada para Edge Functions ───────────────────────────────────────

/**
 * Obtiene un token de MercadoLibre listo para usar.
 *
 * @param supabase  El cliente Supabase con service_role (ya lo tenés en cada función)
 * @param opts.storeId  ID de la tienda. Omitir o null = cuenta global del marketplace
 * @param opts.siteId   Site ML. Default: 'MLU'
 *
 * @example
 * // En publicar-en-ml:
 * const mlToken = await getMLToken(supabase, { storeId: body.store_id, siteId: 'MLU' })
 * const res = await fetch('https://api.mercadolibre.com/items', {
 *   headers: { Authorization: `Bearer ${mlToken}` }
 * })
 */
export async function getMLToken(
  supabase: unknown,
  opts: { storeId?: string | null; siteId?: MLSiteId } = {}
): Promise<string> {
  const ml = buildMLModule(supabase)
  return ml.tokens.getMLToken(opts.storeId ?? null, opts.siteId ?? 'MLU')
}

/**
 * Obtiene un token de MercadoPago listo para usar.
 *
 * @example
 * // En create_preference:
 * const mpToken = await getMPToken(supabase, { storeId: body.store_id })
 * const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
 *   headers: { Authorization: `Bearer ${mpToken}` }
 * })
 */
export async function getMPToken(
  supabase: unknown,
  opts: { storeId?: string | null; siteId?: MLSiteId } = {}
): Promise<string> {
  const ml = buildMLModule(supabase)
  return ml.tokens.getMPToken(opts.storeId ?? null, opts.siteId ?? 'MLU')
}
