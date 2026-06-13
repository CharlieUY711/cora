/**
 * configLoader.ts
 * Carga la configuración del cliente desde Supabase (infraestructura Charlie).
 *
 * Detecta el cliente por:
 *   1. Query param ?slug=testing  (desarrollo / testing)
 *   2. window.location.hostname   (producción — cada cliente tiene su dominio)
 *
 * Lee de la tabla tenant_config que unifica toda la configuración del tenant.
 * Nunca toca los datos del cliente — solo lee la config del shell.
 */

// Supabase de Charlie — donde vive la configuración de todos los clientes
const CHARLIE_URL = 'https://qhnmxvexkizcsmivfuam.supabase.co';
const CHARLIE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobm14dmV4a2l6Y3NtaXZmdWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjEyODEsImV4cCI6MjA4Njc5NzI4MX0.Ifz4fJYldIGZFzhBK5PPxQeqdYzO2ZKNQ5uo8j2mYmM';

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface Conjunto {
  tabla:   string;
  filtro:  Record<string, any>;
  mapeo:   Record<string, string>;
}

export interface RemoteConfig {
  tenantId:      string;
  tenantNombre:  string;
  clienteNombre: string;
  shell:         string;
  theme: {
    primary:    string;
    secondary?: string;
    nombre?:    string;
    logo?:      string;
  };
  modulos:   string[];
  backend: {
    tipo:        string;
    url:         string;
    anon_key:    string;
    supabaseUrl: string;
    supabaseKey: string;
  };
  conjuntos: Record<string, Conjunto>;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function charlieFetch(path: string) {
  const res = await fetch(`${CHARLIE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey':        CHARLIE_KEY,
      'Authorization': `Bearer ${CHARLIE_KEY}`,
      'Content-Type':  'application/json',
    },
  });
  if (!res.ok) throw new Error(`Charlie API error: ${res.status}`);
  return res.json();
}

function detectTenantIdentifier(): string | null {
  const params = new URLSearchParams(window.location.search);
  const slugParam = params.get('slug');
  if (slugParam) return slugParam;

  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return null;
  return hostname;
}

// ── Carga principal ────────────────────────────────────────────────────────────

export async function loadRemoteConfig(): Promise<RemoteConfig | null> {
  try {
    const identifier = detectTenantIdentifier();

    if (!identifier) {
      console.warn('[ConfigLoader] No se detectó tenant — usando config estática.');
      return null;
    }

    // Buscar primero por dominio, luego por tenant_id
    let rows: any[] = await charlieFetch(
      `tenant_config?dominio=eq.${encodeURIComponent(identifier)}&activo=eq.true&limit=1`
    );

    if (!rows || rows.length === 0) {
      rows = await charlieFetch(
        `tenant_config?tenant_id=eq.${encodeURIComponent(identifier)}&activo=eq.true&limit=1`
      );
    }

    if (!rows || rows.length === 0) {
      console.warn(`[ConfigLoader] Tenant "${identifier}" no encontrado en tenant_config.`);
      return null;
    }

    const cfg = rows[0];

    return {
      tenantId:      cfg.tenant_id,
      tenantNombre:  cfg.nombre,
      clienteNombre: cfg.nombre,
      shell:         cfg.shell     || 'DashboardShell',
      theme:         cfg.theme     || { primary: '#6366F1' },
      modulos:       cfg.modulos   || [],
      backend: {
        tipo:        cfg.backend?.tipo     || 'supabase',
        url:         cfg.backend?.url      || '',
        anon_key:    cfg.backend?.anon_key || '',
        supabaseUrl: cfg.backend?.url      || '',
        supabaseKey: cfg.backend?.anon_key || '',
      },
      conjuntos: cfg.conjuntos || {},
    };

  } catch (error) {
    console.error('[ConfigLoader] Error cargando config remota:', error);
    return null;
  }
}
