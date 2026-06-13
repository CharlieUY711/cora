/**
 * OrchestratorProvider.tsx
 * Orquestador Charlie Platform — Capa 2
 *
 * Responsabilidades:
 *   1. Carga la config remota del cliente desde Supabase de Charlie
 *   2. Inyecta los tokens CSS del tema del cliente en :root
 *   3. Expone la config vía contexto (useOrchestrator)
 *   4. Provee el cliente Supabase del cliente (su backend propio)
 *
 * Principio Data Zero:
 *   - Config del shell  → Supabase Charlie (qhnmxvexkizcsmivfuam)
 *   - Datos del cliente → Supabase del cliente (backend.supabaseUrl)
 *   - Nunca se mezclan
 */

import React, { createContext, useContext, useEffect } from 'react';
import { useRemoteConfig } from '../hooks/useRemoteConfig';
import type { RemoteConfig } from '../../config/configLoader';

// ── Contexto ──────────────────────────────────────────────────────────────────

interface OrchestratorContextValue {
  config:       RemoteConfig | null;
  isReady:      boolean;
  clienteNombre: string;
}

const OrchestratorContext = createContext<OrchestratorContextValue>({
  config:        null,
  isReady:       false,
  clienteNombre: 'Charlie Platform',
});

export const useOrchestrator = () => useContext(OrchestratorContext);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convierte los colores del theme de cliente_config
 * a variables CSS Custom Properties que el shell consume.
 */
function applyThemeTokens(theme: RemoteConfig['theme']) {
  const root = document.documentElement;

  if (theme.primary) {
    root.style.setProperty('--shell-primary', theme.primary);
    root.style.setProperty('--shell-border-focus', theme.primary);
  }
  if (theme.secondary) {
    root.style.setProperty('--shell-secondary', theme.secondary);
  }

  console.info('[Orchestrator] Tokens CSS aplicados:', theme);
}

function removeThemeTokens() {
  const root = document.documentElement;
  root.style.removeProperty('--shell-primary');
  root.style.removeProperty('--shell-border-focus');
  root.style.removeProperty('--shell-secondary');
}

// ── Componente ────────────────────────────────────────────────────────────────

interface OrchestratorProviderProps {
  children: React.ReactNode;
  /** Slot para mostrar mientras carga (opcional) */
  loadingFallback?: React.ReactNode;
  /** Slot para mostrar en error (opcional) */
  errorFallback?: React.ReactNode;
}

export function OrchestratorProvider({
  children,
  loadingFallback,
  errorFallback,
}: OrchestratorProviderProps) {
  const configState = useRemoteConfig();

  // Aplicar tokens CSS cuando la config está lista
  useEffect(() => {
    if (configState.status === 'ready') {
      applyThemeTokens(configState.config.theme);
      return () => removeThemeTokens();
    }
  }, [configState.status]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (configState.status === 'loading') {
    return loadingFallback ? (
      <>{loadingFallback}</>
    ) : (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F4F5F7',
        fontFamily: 'system-ui, sans-serif',
        color: '#9CA3AF',
        fontSize: 14,
        gap: 10,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--shell-primary, #6366F1)',
          animation: 'pulse 1.2s ease-in-out infinite',
        }} />
        Iniciando Charlie Platform...
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (configState.status === 'error') {
    console.error('[Orchestrator] Error:', configState.error);
    // En error, renderiza igual con config null — el shell usa defaults
    // No bloquear al usuario por un error de config
  }

  // ── Ready o Static (fallback a config estática) ────────────────────────────
  const config = configState.status === 'ready' ? configState.config : null;

  return (
    <OrchestratorContext.Provider value={{
      config,
      isReady:       configState.status === 'ready',
      clienteNombre: config?.clienteNombre ?? 'Charlie Platform',
    }}>
      {children}
    </OrchestratorContext.Provider>
  );
}
