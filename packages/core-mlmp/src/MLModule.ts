/**
 * @charlieuy711/ml-module — src/MLModule.ts
 *
 * Fachada principal del módulo. Instancia y expone todos los servicios.
 *
 * Uso en React (con sesión de usuario):
 *   const ml = new MLModule({ supabase, appId: 'core-market', getClientSecret })
 *   const token = await ml.tokens.getMLToken('store_123', 'MLU')
 *
 * Uso en Edge Function Deno (service_role):
 *   const ml = new MLModule({ supabase: serviceClient, appId: 'core-market', getClientSecret })
 *   const token = await ml.tokens.getMLToken(storeId, siteId)
 */

import type { MLModuleConfig }  from './types/index.ts'
import { MLModuleError }        from './types/index.ts'
import { MLVaultService }       from './services/MLVaultService.ts'
import { TokenManager }         from './services/TokenManager.ts'
import { OAuthService }         from './services/OAuthService.ts'

export class MLModule {
  /** Acceso directo al vault (leer/listar entradas) */
  readonly vault:  MLVaultService
  /** Obtener tokens listos para usar, con refresh automático */
  readonly tokens: TokenManager
  /** Flujo OAuth completo: connect URL + callback handler */
  readonly oauth:  OAuthService

  constructor(config: MLModuleConfig) {
    this.vault  = new MLVaultService({ supabase: config.supabase, appId: config.appId })
    this.tokens = new TokenManager(config)
    this.oauth  = new OAuthService(config)
  }
}

// Re-exports para que los consumidores no necesiten imports múltiples
export { MLModuleError }
export type { MLModuleConfig, MLVaultKey, MLVaultValue, MLSiteId, MLProvider } from './types/index.ts'
export { MLVaultService }  from './services/MLVaultService.ts'
export { TokenManager }    from './services/TokenManager.ts'
export { OAuthService }    from './services/OAuthService.ts'
export type { OAuthState, ConnectResult, CallbackResult } from './services/OAuthService.ts'
