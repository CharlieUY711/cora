/**
 * @charlieuy711/ml-module — src/services/MLVaultService.ts
 *
 * Capa de acceso al API Vault para credenciales ML/MP.
 *
 * Responsabilidades:
 *   - Leer entradas de api_vault filtrando por platform, siteId, storeId
 *   - Serializar / deserializar MLVaultValue dentro del campo `value`
 *   - Crear / actualizar entradas cuando llegan tokens nuevos (OAuth callback o refresh)
 *   - Resolver la prioridad tienda → global del marketplace
 *
 * NO hace refresh de tokens — eso es responsabilidad de TokenManager.
 * NO tiene lógica de negocio ML/MP — solo lee y escribe el vault.
 */

import type {
  MLVaultKey,
  MLVaultValue,
  MLModuleConfig,
  MLSiteId,
  MLProvider,
  SupabaseLike,
} from '../types/index.ts'
import { MLModuleError } from '../types/index.ts'
import type { ApiVaultEntry, ApiVaultInsert } from '@charlieuy711/api-vault'

const TABLE = 'api_vault'

export class MLVaultService {
  private readonly supabase: SupabaseLike
  private readonly appId:    string

  constructor(config: Pick<MLModuleConfig, 'supabase' | 'appId'>) {
    this.supabase = config.supabase
    this.appId    = config.appId
  }

  // ── Lectura ────────────────────────────────────────────────────────────────

  /**
   * Resuelve la credencial para una key siguiendo la prioridad:
   *   1. Credencial propia de la tienda (storeId + platform + siteId)
   *   2. Credencial global del marketplace (storeId=null + platform + siteId)
   *
   * Devuelve null si no hay ninguna configurada.
   */
  async resolve(key: MLVaultKey): Promise<{ entry: ApiVaultEntry; value: MLVaultValue } | null> {
    // Intentar credencial propia de la tienda primero
    if (key.storeId !== null) {
      const own = await this._fetchOne(key.platform, key.siteId, key.storeId)
      if (own) return own
    }

    // Fallback: credencial global del marketplace
    const global = await this._fetchOne(key.platform, key.siteId, null)
    return global
  }

  /**
   * Lista todas las entradas ML/MP activas para un storeId (o globales).
   * Útil para el panel de admin.
   */
  async list(storeId: string | null): Promise<Array<{ entry: ApiVaultEntry; value: MLVaultValue }>> {
    let query = this.supabase
      .from(TABLE)
      .select('*')
      .in('platform', ['MercadoLibre', 'MercadoPago'])
      .eq('type', 'oauth')
      .contains('tags', [this.appId])
      .order('created_at', { ascending: false })

    if (storeId !== null) {
      query = query.eq('tenant_id', storeId)
    } else {
      query = query.is('tenant_id', null)
    }

    const { data, error } = await query
    if (error) throw new MLModuleError(`Error listando vault: ${error.message}`, 'VAULT_ERROR')

    return (data ?? []).map((row: ApiVaultEntry) => ({
      entry: row,
      value: this._parseValue(row),
    }))
  }

  // ── Escritura ──────────────────────────────────────────────────────────────

  /**
   * Guarda una credencial en el vault.
   * Si ya existe una entrada para ese platform/siteId/storeId, la actualiza.
   * Si no existe, la crea.
   *
   * El campo `name` se genera automáticamente: "MercadoLibre MLU (Tienda X)"
   */
  async save(
    key:      MLVaultKey,
    value:    MLVaultValue,
    meta?: { nickname?: string; notes?: string }
  ): Promise<ApiVaultEntry> {
    const existing = await this._fetchOne(key.platform, key.siteId, key.storeId)

    const serialized = JSON.stringify(value)
    const name       = this._entryName(key, meta?.nickname)
    const tags       = this._tags(key)

    if (existing) {
      // Actualizar entrada existente
      const { data, error } = await this.supabase
        .from(TABLE)
        .update({
          value:      serialized,
          name,
          tags,
          expires_at: new Date(value.expiresAt).toISOString(),
          notes:      meta?.notes ?? existing.entry.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.entry.id)
        .select()
        .single()

      if (error) throw new MLModuleError(`Error actualizando vault: ${error.message}`, 'VAULT_ERROR')
      return data as ApiVaultEntry

    } else {
      // Crear nueva entrada
      const insert: ApiVaultInsert = {
        tenant_id:  key.storeId,
        created_by: null,
        name,
        platform:   key.platform,
        type:       'oauth',
        value:      serialized,
        env:        'production',
        tags,
        notes:      meta?.notes ?? null,
        expires_at: new Date(value.expiresAt).toISOString(),
      }

      const { data, error } = await this.supabase
        .from(TABLE)
        .insert(insert)
        .select()
        .single()

      if (error) throw new MLModuleError(`Error creando entrada en vault: ${error.message}`, 'VAULT_ERROR')
      return data as ApiVaultEntry
    }
  }

  /**
   * Elimina la credencial de un store/platform/site.
   * No elimina el fallback global — solo la entrada específica del storeId.
   */
  async remove(key: MLVaultKey): Promise<void> {
    const existing = await this._fetchOne(key.platform, key.siteId, key.storeId)
    if (!existing) return

    const { error } = await this.supabase
      .from(TABLE)
      .delete()
      .eq('id', existing.entry.id)

    if (error) throw new MLModuleError(`Error eliminando del vault: ${error.message}`, 'VAULT_ERROR')
  }

  // ── Helpers privados ───────────────────────────────────────────────────────

  private async _fetchOne(
    platform: MLProvider,
    siteId:   MLSiteId,
    storeId:  string | null
  ): Promise<{ entry: ApiVaultEntry; value: MLVaultValue } | null> {
    let query = this.supabase
      .from(TABLE)
      .select('*')
      .eq('platform', platform)
      .eq('type', 'oauth')
      .contains('tags', [this.appId, siteId])

    if (storeId !== null) {
      query = query.eq('tenant_id', storeId)
    } else {
      query = query.is('tenant_id', null)
    }

    const { data, error } = await query.maybeSingle()

    if (error) throw new MLModuleError(`Error leyendo vault: ${error.message}`, 'VAULT_ERROR')
    if (!data)  return null

    return { entry: data as ApiVaultEntry, value: this._parseValue(data as ApiVaultEntry) }
  }

  private _parseValue(entry: ApiVaultEntry): MLVaultValue {
    try {
      return JSON.parse(entry.value) as MLVaultValue
    } catch {
      throw new MLModuleError(
        `Valor inválido en vault para entrada ${entry.id} (${entry.platform})`,
        'VAULT_ERROR',
        { entryId: entry.id }
      )
    }
  }

  private _entryName(key: MLVaultKey, nickname?: string): string {
    const who  = nickname ? ` · ${nickname}` : key.storeId ? ` · Tienda ${key.storeId}` : ' · Global'
    return `${key.platform} ${key.siteId}${who}`
  }

  /**
   * Tags que permiten filtrar entradas:
   *   - appId:   filtra por aplicación (core-market)
   *   - siteId:  filtra por site (MLU, MLA...)
   *   - storeId: filtrado adicional (pero se usa tenant_id para eso)
   */
  private _tags(key: MLVaultKey): string[] {
    const tags = [this.appId, key.siteId]
    if (key.storeId) tags.push(`store:${key.storeId}`)
    return tags
  }
}
