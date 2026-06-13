/**
 * useRemoteConfig.ts
 * Hook que carga la configuración remota al montar la app.
 * Maneja loading, error y fallback a config estática.
 */

import { useState, useEffect } from 'react';
import { loadRemoteConfig, type RemoteConfig } from '../../config/configLoader';

export type ConfigState =
  | { status: 'loading' }
  | { status: 'ready';  config: RemoteConfig }
  | { status: 'static'; reason: string }
  | { status: 'error';  error: string };

export function useRemoteConfig(): ConfigState {
  const [state, setState] = useState<ConfigState>({ status: 'loading' });

  useEffect(() => {
    loadRemoteConfig()
      .then(config => {
        if (config) {
          setState({ status: 'ready', config });
          console.info(`[DashboardShell] Config cargada para: ${config.clienteNombre}`);
        } else {
          setState({ status: 'static', reason: 'No se detectó cliente — usando config estática' });
        }
      })
      .catch(error => {
        setState({ status: 'error', error: error.message });
      });
  }, []);

  return state;
}
