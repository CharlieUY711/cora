/**
 * @charlieuy711/ml-module — src/services/OAuthService.ts
 *
 * Gestiona el flujo OAuth 2.0 Authorization Code con ML y MP.
 *
 * Responsabilidades:
 *   1. Generar la URL de autorización (connect)
 *   2. Canjear el code por tokens (callback)
 *   3. Guardar los tokens en el vault via MLVaultService
 *
 * El OAuthService no sabe nada de Express, Deno, Next, etc.
 * El caller (Edge Function, route handler, etc.) es responsable de
 * hacer la redirección y parsear la URL.
 */

import type { MLModuleConfig, MLVaultKey, MLSiteId, MLProvider } from '../types/index.ts'
import { MLModuleError } from '../types/index.ts'
import { MLVaultService } from './MLVaultService.ts'

const ML_AUTH_BASE = 'https://auth.mercadolibre.com.ar'
const ML_API       = 'https://api.mercadolibre.com'
const MP_API       = 'https://api.mercadopago.com'

interface OAuthResponse {
  access_token:  string
  refresh_token: string
  expires_in:    number
  user_id?:      number
  scope?:        string
  public_key?:   string
  message?:      string
}

interface ConnectOptions {
  /** ID de la tienda que está conectando su cuenta. null = cuenta global del MKP */
  storeId:    string | null
  platform:   MLProvider
  siteId:     MLSiteId
  /**
   * URL a la que ML/MP redirigirá con el `code`.
   * Debe estar registrada en el Developer Portal de ML.
   * Ejemplo: https://xyz.supabase.co/functions/v1/ml-oauth?action=callback
   */
  redirectUri: string
  /**
   * Datos que queremos recuperar en el callback sin usar sesión.
   * Se codifica en el parámetro `state` de OAuth.
   */
  stateExtra?: Record<string, string>
}

interface CallbackOptions {
  /** El `code` que ML/MP envió en la query string */
  code:        string
  /** El `state` que enviamos en el connect, parseado */
  state:       OAuthState
  redirectUri: string
}

export interface OAuthState {
  storeId:   string | null
  platform:  MLProvider
  siteId:    MLSiteId
  appId:     string
  extra?:    Record<string, string>
}

export interface ConnectResult {
  /** URL a la que redirigir al usuario para autorizar */
  authUrl: string
  /** State codificado — para validar en el callback */
  state:   string
}

export interface CallbackResult {
  /** Token de acceso obtenido */
  accessToken: string
  /** ID del vendedor en ML/MP */
  sellerId:    number | undefined
  /** Nickname del vendedor */
  nickname:    string | undefined
  /** ID de la entrada creada en el vault */
  vaultEntryId: string
}

export class OAuthService {
  private readonly vault:  MLVaultService
  private readonly config: MLModuleConfig

  constructor(config: MLModuleConfig) {
    this.config = config
    this.vault  = new MLVaultService({ supabase: config.supabase, appId: config.appId })
  }

  // ── PASO 1: Generar URL de autorización ───────────────────────────────────

  /**
   * Genera la URL a la que redirigir al usuario para autorizar la app.
   *
   * Ejemplo de uso en una Edge Function:
   *   const { authUrl } = await oauth.connect({ storeId: 'store_123', ... })
   *   return Response.redirect(authUrl)
   */
  async connect(opts: ConnectOptions): Promise<ConnectResult> {
    const { platform, siteId, storeId, redirectUri, stateExtra } = opts

    const appId = await this._getAppId(platform, siteId)

    const state: OAuthState = {
      storeId,
      platform,
      siteId,
      appId: this.config.appId,
      extra: stateExtra,
    }
    const encodedState = btoa(JSON.stringify(state))

    let authUrl: URL

    if (platform === 'MercadoLibre') {
      authUrl = new URL(`${ML_AUTH_BASE}/authorization`)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('client_id',     appId)
      authUrl.searchParams.set('redirect_uri',  redirectUri)
      authUrl.searchParams.set('state',         encodedState)

    } else {
      // MercadoPago
      authUrl = new URL(`${MP_API}/authorization`)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('client_id',     appId)
      authUrl.searchParams.set('redirect_uri',  redirectUri)
      authUrl.searchParams.set('state',         encodedState)
    }

    return { authUrl: authUrl.toString(), state: encodedState }
  }

  /**
   * Parsea el state codificado en base64 que llega en el callback.
   * Lanza si el formato es inválido.
   */
  parseState(rawState: string): OAuthState {
    try {
      return JSON.parse(atob(rawState)) as OAuthState
    } catch {
      throw new MLModuleError(
        `State OAuth inválido: "${rawState}"`,
        'INVALID_CONFIG'
      )
    }
  }

  // ── PASO 2: Canjear code por tokens y guardar en vault ────────────────────

  /**
   * Procesa el callback de ML/MP:
   *   1. Canjea el `code` por access_token + refresh_token
   *   2. Obtiene info del vendedor (nickname, user_id)
   *   3. Guarda los tokens en el vault
   *
   * Ejemplo de uso en una Edge Function:
   *   const result = await oauth.handleCallback({ code, state, redirectUri })
   *   return Response.redirect(`${adminUrl}?connected=true&seller=${result.nickname}`)
   */
  async handleCallback(opts: CallbackOptions): Promise<CallbackResult> {
    const { code, state, redirectUri } = opts
    const { storeId, platform, siteId } = state

    const apiBase      = platform === 'MercadoPago' ? MP_API : ML_API
    const oauthUrl     = `${apiBase}/oauth/token`
    const appId        = await this._getAppId(platform, siteId)
    const clientSecret = await this._getClientSecret(platform, siteId)

    // Canjear code por tokens
    const tokenRes = await fetch(oauthUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        client_id:     appId,
        client_secret: clientSecret,
        code,
        redirect_uri:  redirectUri,
      }),
    })

    const tokenData = await tokenRes.json() as OAuthResponse

    if (!tokenRes.ok) {
      throw new MLModuleError(
        `OAuth callback fallido para ${platform}/${siteId}: ${tokenData.message ?? tokenRes.statusText}`,
        'REFRESH_FAILED',
        { platform, siteId, storeId, status: tokenRes.status }
      )
    }

    // Obtener info del vendedor
    const { nickname } = await this._fetchSellerInfo(
      platform, tokenData.access_token, tokenData.user_id
    )

    // Construir clave del vault
    const vaultKey: MLVaultKey = { storeId, platform, siteId }

    // Calcular vencimiento
    // ML: 6 horas (21600s). MP: 180 días (15552000s) para OAuth de vendedor.
    const defaultExpiry = platform === 'MercadoPago' ? 15_552_000 : 21_600
    const expiresAt     = Date.now() + (tokenData.expires_in ?? defaultExpiry) * 1000

    // Guardar en vault
    const entry = await this.vault.save(
      vaultKey,
      {
        accessToken:  tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        appId,
        sellerId:     tokenData.user_id,
        nickname,
        publicKey:    tokenData.public_key,
      },
      { nickname }
    )

    return {
      accessToken:  tokenData.access_token,
      sellerId:     tokenData.user_id,
      nickname,
      vaultEntryId: entry.id,
    }
  }

  /**
   * Desconecta una cuenta: elimina la entrada del vault.
   */
  async disconnect(key: MLVaultKey): Promise<void> {
    await this.vault.remove(key)
  }

  // ── Helpers privados ───────────────────────────────────────────────────────

  /**
   * El appId de ML/MP (client_id) se obtiene vía getClientSecret usando
   * una convención de key especial. O puede ser una función separada —
   * aquí lo obtenemos del vault buscando una entrada de tipo 'api_key'
   * con name='ML_APP_ID' o desde la config.
   *
   * Convención recomendada: guardar el App ID de ML en el vault como:
   *   platform: 'MercadoLibre', type: 'api_key', name: 'App ID MLU'
   *   value: '123456789'
   *
   * O más simple: exponerlo como variable de entorno y pasarlo en getClientSecret.
   * En esta implementación lo pedimos via getClientSecret con key 'APP_ID'.
   */
  private async _getAppId(platform: MLProvider, siteId: MLSiteId): Promise<string> {
    // getClientSecret con siteId 'APP_ID' como convención para el app_id
    // El caller puede implementar esto como:
    //   if (siteId === 'APP_ID') return Deno.env.get(`ML_APP_ID_${platform}`)
    // O simplemente retornar siempre desde env.
    const appId = await this.config.getClientSecret(platform, `APP_ID_${siteId}` as MLSiteId)
      .catch(() => this.config.getClientSecret(platform, 'APP_ID' as MLSiteId))

    if (!appId) throw new MLModuleError(
      `App ID no configurado para ${platform}/${siteId}`,
      'MISSING_CLIENT_SECRET', { platform, siteId }
    )
    return appId
  }

  private async _getClientSecret(platform: MLProvider, siteId: MLSiteId): Promise<string> {
    const secret = await this.config.getClientSecret(platform, siteId)
    if (!secret) throw new MLModuleError(
      `Client secret no configurado para ${platform}/${siteId}`,
      'MISSING_CLIENT_SECRET', { platform, siteId }
    )
    return secret
  }

  private async _fetchSellerInfo(
    platform:    MLProvider,
    accessToken: string,
    userId?:     number
  ): Promise<{ nickname?: string }> {
    try {
      const apiBase = platform === 'MercadoPago' ? MP_API : ML_API
      const url     = userId ? `${apiBase}/users/${userId}` : `${apiBase}/users/me`
      const res     = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) return {}
      const data = await res.json()
      return { nickname: data.nickname }
    } catch {
      return {}
    }
  }
}
