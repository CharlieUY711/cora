/**
 * @charlieuy711/ml-module — src/types/index.ts
 *
 * Contratos del módulo. Todo gira alrededor del ApiVaultEntry
 * del paquete @charlieuy711/api-vault como fuente de verdad.
 */

// ── Re-export para que los consumidores no necesiten importar api-vault ────────
export type { ApiVaultEntry } from '@charlieuy711/api-vault'

// ── Sites ──────────────────────────────────────────────────────────────────────
export type MLSiteId =
  | 'MLU' | 'MLA' | 'MLB' | 'MLM' | 'MLC' | 'MCO' | 'MPE' | string

export const ML_SITE_CURRENCY: Record<string, string> = {
  MLU: 'UYU', MLA: 'ARS', MLB: 'BRL', MLM: 'MXN',
  MLC: 'CLP', MCO: 'COP', MPE: 'PEN',
}

// ── Providers soportados ───────────────────────────────────────────────────────
export type MLProvider = 'MercadoLibre' | 'MercadoPago'

/**
 * Estructura del campo `value` en api_vault para entradas ML/MP.
 *
 * Se serializa como JSON en api_vault.value.
 * Nunca se accede al valor crudo — siempre a través de MLVaultService.
 */
export interface MLVaultValue {
  accessToken:  string
  refreshToken: string
  expiresAt:    number   // ms epoch
  appId:        string
  sellerId?:    string | number
  nickname?:    string
  publicKey?:   string   // solo MercadoPago
}

/**
 * Clave de búsqueda en el vault.
 * Determina qué entrada se usa para una operación.
 *
 * Resolución (orden de prioridad):
 *   1. tenant_id = storeId  + platform + siteId → credencial propia de la tienda
 *   2. tenant_id = null     + platform + siteId → credencial global del marketplace
 */
export interface MLVaultKey {
  /** ID de la tienda. null = credencial global del marketplace */
  storeId:   string | null
  platform:  MLProvider
  siteId:    MLSiteId
}

// ── Configuración del módulo ───────────────────────────────────────────────────

/**
 * Config que recibe MLModule al instanciarse.
 * El cliente Supabase es la única dependencia de infraestructura.
 */
export interface MLModuleConfig {
  /**
   * Cliente Supabase ya autenticado.
   * - En React: el cliente con la sesión del usuario (anon key)
   * - En Edge Functions: el cliente con service_role key
   */
  supabase: SupabaseLike

  /**
   * Función que devuelve el client_secret de ML para refrescar tokens.
   * El secret NUNCA se guarda en el vault — se inyecta en runtime.
   *
   * Implementaciones típicas:
   *   - Edge Function: Deno.env.get(`ML_CLIENT_SECRET_${siteId}`)
   *   - Server: process.env[`ML_CLIENT_SECRET_${siteId}`]
   *   - Tests: () => Promise.resolve('test_secret')
   */
  getClientSecret: (platform: MLProvider, siteId: MLSiteId) => Promise<string>

  /**
   * App ID del vault que identifica las entradas de este marketplace.
   * Se usa como tag en api_vault: tags.includes(appId)
   * Ejemplo: 'core-market', 'oddy-market'
   */
  appId: string

  /**
   * Margen en ms antes del vencimiento para hacer refresh proactivo.
   * Default: 5 minutos
   */
  refreshMarginMs?: number

  /** Logger opcional. Default: console */
  logger?: MLLogger
}

export interface MLLogger {
  info:  (msg: string, meta?: Record<string, unknown>) => void
  warn:  (msg: string, meta?: Record<string, unknown>) => void
  error: (msg: string, meta?: Record<string, unknown>) => void
}

/** Interfaz mínima del cliente Supabase que el módulo usa */
export interface SupabaseLike {
  from(table: string): any
  auth: { getUser(): Promise<{ data: { user: { id: string } | null }; error: unknown }> }
}

// ── Errores ────────────────────────────────────────────────────────────────────
export type MLErrorCode =
  | 'NO_CREDENTIAL'
  | 'REFRESH_FAILED'
  | 'MISSING_CLIENT_SECRET'
  | 'VAULT_ERROR'
  | 'INVALID_CONFIG'
  | 'API_ERROR'

export class MLModuleError extends Error {
  constructor(
    message: string,
    public readonly code: MLErrorCode,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'MLModuleError'
  }
}

// ── Resultado de operaciones ───────────────────────────────────────────────────
export interface MLResult<T = void> {
  ok:     boolean
  data?:  T
  error?: string
  code?:  MLErrorCode
}
