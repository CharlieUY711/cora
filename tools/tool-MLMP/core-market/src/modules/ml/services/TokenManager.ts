/**
 * @charlieuy711/ml-module — src/services/TokenManager.ts
 *
 * Gestiona el ciclo de vida de los tokens OAuth de ML y MP.
 *
 * Flujo para cada getMLToken() / getMPToken():
 *   1. Pide la credencial a MLVaultService (resuelve tienda → global)
 *   2. Si el token está vigente → lo devuelve directamente
 *   3. Si está próximo a vencer → hace refresh, persiste en vault y devuelve el nuevo
 *   4. Si no hay credencial → lanza MLModuleError con código NO_CREDENTIAL
 *
 * Inflight deduplication: si dos calls concurrentes piden el token del mismo
 * store/site mientras se está haciendo refresh, comparten el mismo Promise.
 */

import type {
  MLModuleConfig,
  MLVaultKey,
  MLVaultValue,
  MLSiteId,
  MLProvider,
} from '../types/index.ts'
import { MLModuleError } from '../types/index.ts'
import { MLVaultService } from './MLVaultService.ts'

const ML_OAUTH_URL = 'https://api.mercadolibre.com/oauth/token'
const MP_OAUTH_URL = 'https://api.mercadopago.com/oauth/token'

interface OAuthResponse {
  access_token:  string
  refresh_token: string
  expires_in:    number
  user_id?:      number
  public_key?:   string
  message?:      string
}

export class TokenManager {
  private readonly vault:           MLVaultService
  private readonly config:          MLModuleConfig
  private readonly refreshMarginMs: number
  private readonly log:             MLModuleConfig['logger']

  /** Deduplica refreshes concurrentes para el mismo store/platform/site */
  private readonly _inflight = new Map<string, Promise<string>>()

  constructor(config: MLModuleConfig) {
    if (!config.supabase)         throw new MLModuleError('supabase es obligatorio', 'INVALID_CONFIG')
    if (!config.appId)            throw new MLModuleError('appId es obligatorio', 'INVALID_CONFIG')
    if (!config.getClientSecret)  throw new MLModuleError('getClientSecret es obligatorio', 'INVALID_CONFIG')

    this.config          = config
    this.vault           = new MLVaultService({ supabase: config.supabase, appId: config.appId })
    this.refreshMarginMs = config.refreshMarginMs ?? 300_000
    this.log             = config.logger ?? {
      info:  (m, meta) => console.log(`[ml-module] ${m}`, meta ?? ''),
      warn:  (m, meta) => console.warn(`[ml-module] ${m}`, meta ?? ''),
      error: (m, meta) => console.error(`[ml-module] ${m}`, meta ?? ''),
    }
  }

  // ── API pública ────────────────────────────────────────────────────────────

  /**
   * Devuelve un access token de MercadoLibre listo para usar en headers.
   *
   * @param storeId  ID de la tienda. null = cuenta global del marketplace.
   * @param siteId   Site ML. Default: 'MLU'
   *
   * @throws MLModuleError (NO_CREDENTIAL) si no hay credencial configurada
   * @throws MLModuleError (REFRESH_FAILED) si el token venció y no se pudo refrescar
   */
  async getMLToken(storeId: string | null, siteId: MLSiteId = 'MLU'): Promise<string> {
    const key: MLVaultKey = { storeId, platform: 'MercadoLibre', siteId }
    return this._resolve(key, ML_OAUTH_URL)
  }

  /**
   * Devuelve un access token de MercadoPago listo para usar.
   *
   * @param storeId  ID de la tienda. null = cuenta global del marketplace.
   * @param siteId   Site. Default: 'MLU'
   */
  async getMPToken(storeId: string | null, siteId: MLSiteId = 'MLU'): Promise<string> {
    const key: MLVaultKey = { storeId, platform: 'MercadoPago', siteId }
    return this._resolve(key, MP_OAUTH_URL)
  }

  /**
   * Fuerza un refresh inmediato sin importar el tiempo de vencimiento.
   * Útil para el endpoint de admin "renovar token manualmente".
   */
  async forceRefresh(key: MLVaultKey): Promise<string> {
    const resolved = await this.vault.resolve(key)
    if (!resolved) throw new MLModuleError(
      this._noCredMessage(key), 'NO_CREDENTIAL', { key }
    )
    const oauthUrl = key.platform === 'MercadoPago' ? MP_OAUTH_URL : ML_OAUTH_URL
    return this._doRefresh(key, resolved.value, oauthUrl)
  }

  /**
   * Verifica si hay credencial activa para un store/platform/site.
   * No lanza — devuelve false si no hay nada.
   */
  async hasCredential(key: MLVaultKey): Promise<boolean> {
    try {
      const resolved = await this.vault.resolve(key)
      return resolved !== null
    } catch {
      return false
    }
  }

  /**
   * Estado de todas las credenciales de un store (o globales).
   * Incluye tiempo restante, si está vencida, si está usando fallback global.
   */
  async getStatus(storeId: string | null) {
    const entries = await this.vault.list(storeId)
    const now     = Date.now()

    return entries.map(({ entry, value }) => ({
      id:           entry.id,
      platform:     entry.platform as MLProvider,
      siteId:       entry.tags.find(t => t.match(/^ML[A-Z]|^MC[A-Z]/)) ?? 'unknown',
      storeId:      entry.tenant_id,
      isGlobal:     entry.tenant_id === null,
      nickname:     value.nickname,
      sellerId:     value.sellerId,
      expiresAt:    value.expiresAt,
      expiresIn:    Math.max(0, value.expiresAt - now),
      isExpired:    value.expiresAt < now,
      expiringSoon: value.expiresAt - now < this.refreshMarginMs,
      vaultEntryId: entry.id,
    }))
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private async _resolve(key: MLVaultKey, oauthUrl: string): Promise<string> {
    const resolved = await this.vault.resolve(key)

    if (!resolved) {
      throw new MLModuleError(this._noCredMessage(key), 'NO_CREDENTIAL', { key })
    }

    const { value } = resolved
    const msToExpiry = value.expiresAt - Date.now()

    // Token vigente, sin necesidad de refresh
    if (msToExpiry > this.refreshMarginMs) {
      return value.accessToken
    }

    // Token próximo a vencer o ya vencido → refresh con deduplicación
    const inflightKey = `${key.platform}:${key.siteId}:${key.storeId ?? '__global__'}`

    if (!this._inflight.has(inflightKey)) {
      const p = this._doRefresh(key, value, oauthUrl)
        .finally(() => this._inflight.delete(inflightKey))
      this._inflight.set(inflightKey, p)
    }

    return this._inflight.get(inflightKey)!
  }

  private async _doRefresh(
    key:      MLVaultKey,
    value:    MLVaultValue,
    oauthUrl: string,
  ): Promise<string> {
    this.log.info('Refreshing token', { platform: key.platform, siteId: key.siteId, storeId: key.storeId })

    // Obtener client_secret (nunca persiste en vault)
    let clientSecret: string
    try {
      clientSecret = await this.config.getClientSecret(key.platform, key.siteId)
    } catch (err) {
      throw new MLModuleError(
        `No se pudo obtener client_secret para ${key.platform}/${key.siteId}: ${(err as Error).message}`,
        'MISSING_CLIENT_SECRET', { key }
      )
    }
    if (!clientSecret) {
      throw new MLModuleError(
        `client_secret vacío para ${key.platform}/${key.siteId}`,
        'MISSING_CLIENT_SECRET', { key }
      )
    }

    // Llamar al endpoint de OAuth
    const res = await fetch(oauthUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        client_id:     value.appId,
        client_secret: clientSecret,
        refresh_token: value.refreshToken,
      }),
    })

    const data = await res.json() as OAuthResponse

    if (!res.ok) {
      throw new MLModuleError(
        `Refresh fallido para ${key.platform}/${key.siteId}: ${data.message ?? res.statusText}`,
        'REFRESH_FAILED',
        { key, status: res.status }
      )
    }

    // Construir valor actualizado
    const updated: MLVaultValue = {
      ...value,
      accessToken:  data.access_token,
      refreshToken: data.refresh_token ?? value.refreshToken,
      expiresAt:    Date.now() + data.expires_in * 1000,
      ...(data.public_key ? { publicKey: data.public_key } : {}),
    }

    // Persistir en el vault
    try {
      await this.vault.save(key, updated, { nickname: value.nickname })
    } catch (err) {
      // Logueamos pero no fallamos — el token nuevo es válido aunque no se persista
      this.log.warn('No se pudo persistir token renovado en vault', {
        key, error: (err as Error).message,
      })
    }

    this.log.info('Token renovado OK', {
      platform: key.platform, siteId: key.siteId, storeId: key.storeId,
      expiresIn: data.expires_in,
    })

    return data.access_token
  }

  private _noCredMessage(key: MLVaultKey): string {
    const who = key.storeId
      ? `la tienda "${key.storeId}"`
      : 'el marketplace (cuenta global)'
    return (
      `Sin credencial ${key.platform} para ${who} en ${key.siteId}. ` +
      `El administrador debe conectar la cuenta desde el panel → Integraciones → ${key.platform}.`
    )
  }
}
