/**
 * supabase/functions/ml-oauth/index.ts
 *
 * Edge Function genérica para el flujo OAuth de MercadoLibre y MercadoPago.
 * Usa MLModule — no tiene lógica de tokens hardcodeada.
 *
 * Endpoints:
 *
 *   GET  /ml-oauth?action=connect&platform=MercadoLibre&site_id=MLU&store_id=123
 *     → Redirige al usuario a la pantalla de autorización de ML/MP
 *       store_id = null → conecta cuenta global del marketplace
 *
 *   GET  /ml-oauth?action=callback&code=...&state=...
 *     → ML/MP redirige aquí tras la autorización
 *       Guarda los tokens en el vault y redirige al panel admin
 *
 *   POST /ml-oauth  { action: "refresh", platform, site_id, store_id }
 *     → Fuerza refresh manual del token
 *
 *   GET  /ml-oauth?action=status&store_id=123
 *     → Estado de todas las credenciales de una tienda
 *
 *   DELETE /ml-oauth  { platform, site_id, store_id }
 *     → Desconecta una cuenta (elimina del vault)
 *
 * Variables de entorno requeridas:
 *
 *   ML_SECRETS_<PLATFORM>_<SITE>   Formato: "<app_id>:<client_secret>"
 *   Ejemplos:
 *     ML_SECRETS_MERCADOLIBRE_MLU = "123456789:abc123secret"
 *     ML_SECRETS_MERCADOPAGO_MLU  = "987654321:xyz789secret"
 *     ML_SECRETS_MERCADOLIBRE_MLA = "111222333:def456secret"
 *
 *   ML_OAUTH_REDIRECT_URI   URL de esta función, ej:
 *                           https://xyz.supabase.co/functions/v1/ml-oauth?action=callback
 *   ADMIN_PANEL_URL         URL del panel admin, ej: https://app.core.com.uy/admin
 *   APP_ID                  Identificador de la app, ej: core-market
 */

import { createClient }  from 'https://esm.sh/@supabase/supabase-js@2'
import { MLModule }      from '../../src/MLModule.ts'
import type { MLProvider, MLSiteId } from '../../src/types/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url     = new URL(req.url)
  const action  = url.searchParams.get('action') ?? (await _bodyField(req, 'action'))

  // Cliente Supabase con service_role para leer/escribir el vault
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const appId = Deno.env.get('APP_ID') ?? 'core-market'

  /**
   * getClientSecret: convención de env vars.
   *
   * Para app_id (usado en connect URL):
   *   platform=MercadoLibre, siteId='APP_ID_MLU' → ML_SECRETS_MERCADOLIBRE_MLU → parte [0]
   *
   * Para client_secret (usado en refresh/callback):
   *   platform=MercadoLibre, siteId='MLU'        → ML_SECRETS_MERCADOLIBRE_MLU → parte [1]
   *
   * El env var tiene formato "<app_id>:<client_secret>" para mantener las dos piezas juntas.
   */
  const getClientSecret = async (platform: MLProvider, siteId: MLSiteId): Promise<string> => {
    const isAppId = String(siteId).startsWith('APP_ID_')
    const realSiteId = isAppId ? String(siteId).replace('APP_ID_', '') : String(siteId)

    const envKey = `ML_SECRETS_${platform.toUpperCase().replace(' ', '')}_ ${realSiteId}`
    const envVal = Deno.env.get(envKey) ?? Deno.env.get(`ML_SECRETS_${realSiteId}`)

    if (!envVal) throw new Error(`Env var ${envKey} no configurada`)

    const [appIdPart, secretPart] = envVal.split(':')
    return isAppId ? appIdPart : secretPart
  }

  const ml = new MLModule({ supabase, appId, getClientSecret })

  try {
    switch (action) {

      // ── CONNECT ─────────────────────────────────────────────────────────────
      case 'connect': {
        const platform    = (url.searchParams.get('platform') ?? 'MercadoLibre') as MLProvider
        const siteId      = (url.searchParams.get('site_id')  ?? 'MLU') as MLSiteId
        const storeId     = url.searchParams.get('store_id')  // null = global
        const redirectUri = Deno.env.get('ML_OAUTH_REDIRECT_URI')!

        const { authUrl } = await ml.oauth.connect({
          storeId, platform, siteId, redirectUri,
        })

        return Response.redirect(authUrl, 302)
      }

      // ── CALLBACK ─────────────────────────────────────────────────────────────
      case 'callback': {
        const code     = url.searchParams.get('code')
        const rawState = url.searchParams.get('state')
        const adminUrl = Deno.env.get('ADMIN_PANEL_URL') ?? '/'

        if (!code || !rawState) {
          return Response.redirect(`${adminUrl}?ml_error=missing_params`, 302)
        }

        let state
        try {
          state = ml.oauth.parseState(rawState)
        } catch {
          return Response.redirect(`${adminUrl}?ml_error=invalid_state`, 302)
        }

        // Validar que el appId del state coincide con esta función
        if (state.appId !== appId) {
          return Response.redirect(`${adminUrl}?ml_error=app_mismatch`, 302)
        }

        const redirectUri = Deno.env.get('ML_OAUTH_REDIRECT_URI')!

        const result = await ml.oauth.handleCallback({ code, state, redirectUri })

        const params = new URLSearchParams({
          ml_connected: 'true',
          platform:     state.platform,
          site:         state.siteId,
          seller:       result.nickname ?? '',
          store:        state.storeId ?? 'global',
        })

        return Response.redirect(`${adminUrl}?${params}`, 302)
      }

      // ── REFRESH MANUAL ───────────────────────────────────────────────────────
      case 'refresh': {
        const body     = await req.json().catch(() => ({}))
        const platform = (body.platform  ?? 'MercadoLibre') as MLProvider
        const siteId   = (body.site_id   ?? 'MLU') as MLSiteId
        const storeId  = body.store_id   ?? null

        const token = await ml.tokens.forceRefresh({ storeId, platform, siteId })

        return _json({ ok: true, refreshed: true, platform, siteId, storeId })
      }

      // ── STATUS ───────────────────────────────────────────────────────────────
      case 'status': {
        const storeId = url.searchParams.get('store_id') ?? null
        const status  = await ml.tokens.getStatus(storeId)
        return _json({ ok: true, credentials: status })
      }

      // ── DISCONNECT ───────────────────────────────────────────────────────────
      case 'disconnect': {
        const body     = await req.json().catch(() => ({}))
        const platform = (body.platform ?? 'MercadoLibre') as MLProvider
        const siteId   = (body.site_id  ?? 'MLU') as MLSiteId
        const storeId  = body.store_id  ?? null

        await ml.oauth.disconnect({ storeId, platform, siteId })

        return _json({ ok: true, disconnected: { platform, siteId, storeId } })
      }

      default:
        return _json({ error: `Acción desconocida: "${action}"` }, 400)
    }

  } catch (err: unknown) {
    const error = err as Error & { code?: string }
    console.error('[ml-oauth]', error.message, error.code)

    // Si es un error del módulo (NO_CREDENTIAL, etc.) → 404 o 400
    const status = error.code === 'NO_CREDENTIAL' ? 404
                 : error.code === 'MISSING_CLIENT_SECRET' ? 500
                 : 400

    return _json({ ok: false, error: error.message, code: error.code }, status)
  }
})

function _json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function _bodyField(req: Request, field: string): Promise<string | null> {
  try {
    const body = await req.clone().json()
    return body?.[field] ?? null
  } catch {
    return null
  }
}
