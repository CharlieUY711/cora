/**
 * useTable.ts
 * Hook genérico para leer y escribir datos del tenant vía Supabase.
 *
 * Uso básico:
 *   const { data, loading, error } = useTable('transportistas');
 *
 * Con opciones:
 *   const { data, insert, update, remove, refresh } = useTable('transportistas', {
 *     select: 'id, nombre, activo',
 *     filters: { activo: true },
 *     orderBy: { column: 'nombre', ascending: true },
 *   });
 *
 * Principio Data Zero:
 *   Consulta siempre al Supabase del tenant (config.backend).
 *   NUNCA al Supabase de Charlie.
 *
 * Futuro — Sistema de Conjuntos (largo plazo):
 *   Cuando se implemente, este hook recibirá el nombre semántico Charlie
 *   ('transportistas') y los Conjuntos resolverán la tabla real del cliente.
 *   La interfaz pública del hook NO cambiará.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from './useSupabaseClient';
import { useOrchestrator } from '../providers/OrchestratorProvider';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface UseTableOptions {
  /** Columnas a seleccionar — default: '*' */
  select?: string;
  /** Filtros simples de igualdad: { columna: valor } */
  filters?: Record<string, unknown>;
  /** Orden */
  orderBy?: { column: string; ascending?: boolean };
  /** Si false, no hace fetch al montar — default: true */
  autoFetch?: boolean;
}

export interface UseTableResult<T> {
  data:    T[];
  loading: boolean;
  error:   string | null;
  refresh: () => Promise<void>;
  insert:  (row: Partial<T>) => Promise<{ data: T | null; error: string | null }>;
  update:  (id: string | number, changes: Partial<T>) => Promise<{ error: string | null }>;
  remove:  (id: string | number) => Promise<{ error: string | null }>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTable<T = Record<string, unknown>>(
  tabla: string,
  options: UseTableOptions = {}
): UseTableResult<T> {
  const {
    select    = '*',
    filters   = {},
    orderBy,
    autoFetch = true,
  } = options;

  const supabase = useSupabaseClient();
  const { config } = useOrchestrator();

  // Resolver conjunto: si existe en config.conjuntos, usar tabla y filtros del conjunto
  const conjunto = config?.conjuntos?.[tabla];
  const tablaReal   = conjunto?.tabla   ?? tabla;
  const filtrosBase = conjunto?.filtro  ?? {};
  const filtrosMerge = { ...filtrosBase, ...filters };

  const [data,    setData]    = useState<T[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error,   setError]   = useState<string | null>(null);

  // ── FETCH ─────────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!supabase) {
      setError('Supabase client no disponible — verificá config.backend del tenant');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from(tablaReal).select(select);
      Object.entries(filtrosMerge).forEach(([col, val]) => {
        query = query.eq(col, val);
      });
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }
      const { data: rows, error: sbError } = await query;
      if (sbError) throw new Error(sbError.message);
      setData((rows as T[]) ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      setError(msg);
      console.error(`[useTable] Error en "${tabla}":`, msg);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, tabla, select, JSON.stringify(filters), orderBy?.column, orderBy?.ascending]);

  useEffect(() => {
    if (autoFetch) refresh();
  }, [refresh, autoFetch]);

  // ── INSERT ────────────────────────────────────────────────────────────────
  const insert = useCallback(async (row: Partial<T>) => {
    if (!supabase) return { data: null, error: 'Supabase client no disponible' };
    const { data: inserted, error: sbError } = await supabase
      .from(tablaReal).insert(row).select().single();
    if (sbError) {
      console.error(`[useTable] insert en "${tabla}":`, sbError.message);
      return { data: null, error: sbError.message };
    }
    setData(prev => [...prev, inserted as T]);
    return { data: inserted as T, error: null };
  }, [supabase, tabla]);

  // ── UPDATE ────────────────────────────────────────────────────────────────
  const update = useCallback(async (id: string | number, changes: Partial<T>) => {
    if (!supabase) return { error: 'Supabase client no disponible' };
    const { error: sbError } = await supabase
      .from(tablaReal).update(changes).eq('id', id);
    if (sbError) {
      console.error(`[useTable] update en "${tabla}":`, sbError.message);
      return { error: sbError.message };
    }
    setData(prev => prev.map((row: any) => (row.id === id ? { ...row, ...changes } : row)));
    return { error: null };
  }, [supabase, tabla]);

  // ── REMOVE ────────────────────────────────────────────────────────────────
  const remove = useCallback(async (id: string | number) => {
    if (!supabase) return { error: 'Supabase client no disponible' };
    const { error: sbError } = await supabase
      .from(tablaReal).delete().eq('id', id);
    if (sbError) {
      console.error(`[useTable] remove en "${tabla}":`, sbError.message);
      return { error: sbError.message };
    }
    setData(prev => prev.filter((row: any) => row.id !== id));
    return { error: null };
  }, [supabase, tabla]);

  return { data, loading, error, refresh, insert, update, remove };
}
