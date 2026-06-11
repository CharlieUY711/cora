/**
 * examples/core-market-integration.ts
 *
 * Cómo integrar @charlieuy711/ml-module en core-market (Oddy Market).
 *
 * Muestra los tres contextos de uso:
 *   A) Edge Functions de Supabase (Deno, service_role)
 *   B) React hook para el panel admin
 *   C) Cómo configurar las env vars
 */

// ══════════════════════════════════════════════════════════════
// A) EN EDGE FUNCTIONS DE SUPABASE (Deno)
//    Reemplaza el patrón anterior: Deno.env.get('ML_ACCESS_TOKEN')
// ══════════════════════════════════════════════════════════════

// publicar-en-ml/index.ts — ANTES ❌
// const mlToken = Deno.env.get('ML_ACCESS_TOKEN')!

// publicar-en-ml/index.ts — DESPUÉS ✅
import { getMLToken, getMPToken } from '../supabase/functions/_shared/mlToken.ts'

// Ejemplo: publicar-en-ml
async function publicarEnML_ejemplo(supabase: any, body: any) {
  // storeId identifica qué tienda está publicando
  // Si la tienda tiene su propia cuenta ML → la usa
  // Si no → usa la cuenta global del marketplace automáticamente
  const mlToken = await getMLToken(supabase, {
    storeId: body.store_id ?? null,
    siteId:  body.site_id ?? 'MLU',
  })

  const res = await fetch('https://api.mercadolibre.com/items', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${mlToken}`,
    },
    body: JSON.stringify({ /* payload del item */ }),
  })

  return res.json()
}

// Ejemplo: create_preference (MP)
async function createPreference_ejemplo(supabase: any, body: any) {
  const mpToken = await getMPToken(supabase, {
    storeId: body.store_id ?? null,  // null = cuenta global del marketplace
    siteId:  'MLU',
  })

  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${mpToken}`,
    },
    body: JSON.stringify({ /* preference payload */ }),
  })

  return res.json()
}

// ══════════════════════════════════════════════════════════════
// B) EN REACT — Panel admin
//    Para mostrar estado de conexiones y conectar cuentas
// ══════════════════════════════════════════════════════════════

// En AdminML.tsx o AdminIntegraciones.tsx:

import { MLModule } from '../src/MLModule.ts'
import { supabase }  from '../src/utils/supabase/client.ts' // ya existe en core-market

// Instanciar el módulo con el cliente Supabase del usuario
// (con su sesión — RLS protege que solo vea lo suyo)
const ml = new MLModule({
  supabase,
  appId: 'core-market',

  // En React no se usan client_secrets directamente
  // (los secrets solo los necesita el OAuthService en Deno, no en React)
  // Acá solo se usa para el panel de status — las funciones de token
  // no se llaman desde React.
  getClientSecret: async () => {
    throw new Error('getClientSecret no disponible en el cliente React')
  },
})

// Ver estado de credenciales de una tienda
async function mostrarEstadoTienda(storeId: string) {
  const status = await ml.tokens.getStatus(storeId)
  // [
  //   { platform: 'MercadoLibre', siteId: 'MLU', isExpired: false, expiringSoon: false,
  //     nickname: 'ODDY_UY', isGlobal: false, expiresIn: 18000000 },
  //   { platform: 'MercadoPago',  siteId: 'MLU', isExpired: false, expiringSoon: true,
  //     nickname: 'ODDY_UY', isGlobal: true,  expiresIn: 240000 },
  // ]
  return status
}

// Conectar una cuenta ML para una tienda
function conectarMLTienda(storeId: string) {
  // Redirigir a la Edge Function ml-oauth que genera la URL de autorización
  const params = new URLSearchParams({
    action:    'connect',
    platform:  'MercadoLibre',
    site_id:   'MLU',
    store_id:  storeId,
  })
  window.location.href = `/functions/v1/ml-oauth?${params}`
  // ML redirige al usuario → usuario aprueba → callback guarda en vault → admin recibe ?ml_connected=true
}

// Conectar cuenta global del marketplace (para todas las tiendas sin cuenta propia)
function conectarMLGlobal() {
  const params = new URLSearchParams({
    action:   'connect',
    platform: 'MercadoLibre',
    site_id:  'MLU',
    // sin store_id → credencial global
  })
  window.location.href = `/functions/v1/ml-oauth?${params}`
}

// Desconectar
async function desconectar(storeId: string | null, platform: 'MercadoLibre' | 'MercadoPago') {
  await fetch('/functions/v1/ml-oauth', {
    method:  'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
    body:    JSON.stringify({ platform, site_id: 'MLU', store_id: storeId }),
  })
}

// ══════════════════════════════════════════════════════════════
// C) VARIABLES DE ENTORNO — Supabase Edge Functions Secrets
//    Settings → Edge Functions → Secrets
// ══════════════════════════════════════════════════════════════

/*
  Formato: ML_SECRETS_<PLATFORM>_<SITE> = "<app_id>:<client_secret>"

  Ejemplos para Uruguay con ML y MP:
  ─────────────────────────────────────────────────────────────
  APP_ID                            = core-market
  ML_OAUTH_REDIRECT_URI             = https://xyz.supabase.co/functions/v1/ml-oauth?action=callback
  ADMIN_PANEL_URL                   = https://oddyfront.core.com.uy/admin

  ML_SECRETS_MERCADOLIBRE_MLU       = 123456789:tu_client_secret_de_ml_uy
  ML_SECRETS_MERCADOPAGO_MLU        = 987654321:tu_client_secret_de_mp_uy

  Para Argentina (opcional, si expanden):
  ML_SECRETS_MERCADOLIBRE_MLA       = 111222333:tu_client_secret_de_ml_ar
  ML_SECRETS_MERCADOPAGO_MLA        = 444555666:tu_client_secret_de_mp_ar
  ─────────────────────────────────────────────────────────────

  Dónde obtener app_id y client_secret:
    1. Ir a https://developers.mercadolibre.com.ar/
    2. Mis aplicaciones → Nueva aplicación (o usar la existente)
    3. Credenciales → App ID (ese es el app_id) y Secret key (ese es el client_secret)
    4. Configurar redirect_uri = valor de ML_OAUTH_REDIRECT_URI
    5. Activar scopes: read, write, offline_access

  Para MercadoPago:
    1. Ir a https://www.mercadopago.com.uy/developers/panel/app
    2. Crear aplicación o usar existente
    3. Credenciales de producción → App ID y Client Secret
    4. Misma redirect_uri que ML (si es la misma app)
*/

// ══════════════════════════════════════════════════════════════
// D) FLUJO MULTI-TIENDA EN PRODUCCIÓN
// ══════════════════════════════════════════════════════════════

/*
  Escenario: Oddy Market tiene 3 tiendas:
    - Tienda A (store_id: 'store_aaa'): tiene su propia cuenta ML
    - Tienda B (store_id: 'store_bbb'): usa la cuenta global del marketplace
    - Tienda C (store_id: 'store_ccc'): tiene su propia cuenta ML y MP

  api_vault tendría estas entradas:
  ┌─────────────────────────────────────────────────────────────┐
  │ platform      │ tenant_id   │ tags              │ value     │
  ├───────────────┼─────────────┼───────────────────┼───────────┤
  │ MercadoLibre  │ NULL        │ [core-market,MLU] │ {tokens}  │ ← global
  │ MercadoPago   │ NULL        │ [core-market,MLU] │ {tokens}  │ ← global
  │ MercadoLibre  │ store_aaa   │ [core-market,MLU] │ {tokens}  │ ← Tienda A
  │ MercadoLibre  │ store_ccc   │ [core-market,MLU] │ {tokens}  │ ← Tienda C
  │ MercadoPago   │ store_ccc   │ [core-market,MLU] │ {tokens}  │ ← Tienda C
  └─────────────────────────────────────────────────────────────┘

  Cuando publicar-en-ml recibe store_id='store_bbb':
    → getMLToken(supabase, { storeId: 'store_bbb' })
    → MLVaultService busca tenant_id='store_bbb' → no encuentra
    → MLVaultService busca tenant_id=NULL (global) → encuentra ✓
    → devuelve token global

  Cuando publicar-en-ml recibe store_id='store_aaa':
    → getMLToken(supabase, { storeId: 'store_aaa' })
    → MLVaultService busca tenant_id='store_aaa' → encuentra ✓
    → devuelve token propio de la tienda
*/
