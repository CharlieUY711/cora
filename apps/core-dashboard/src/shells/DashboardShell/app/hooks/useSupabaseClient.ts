/**
 * useSupabaseClient.ts
 * Retorna el cliente Supabase del tenant activo.
 * Creado una sola vez por URL — cacheado en memoria.
 *
 * Principio Data Zero:
 *   Usa config.backend del tenant (yomgqobfmgatavnbtvdz para ODDY).
 *   NUNCA el Supabase de Charlie (qhnmxvexkizcsmivfuam).
 */

import { useMemo } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useOrchestrator } from '../providers/OrchestratorProvider';

// Cache en memoria: una instancia por supabaseUrl
const clientCache = new Map<string, SupabaseClient>();

export function useSupabaseClient(): SupabaseClient | null {
  const { config } = useOrchestrator();

  return useMemo(() => {
    const url = config?.backend?.supabaseUrl;
    const key = config?.backend?.supabaseKey;

    if (!url || !key) return null;

    if (!clientCache.has(url)) {
      clientCache.set(url, createClient(url, key));
    }

    return clientCache.get(url)!;
  }, [config?.backend?.supabaseUrl, config?.backend?.supabaseKey]);
}
