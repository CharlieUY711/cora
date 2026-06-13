/**
 * MODULE MANIFEST — Charlie Marketplace Builder
 * ═══════════════════════════════════════════════════
 * Módulos validados: Orquestador · Transportistas · Envios
 */

import React from 'react';
import type { MainSection } from '../AdminDashboard';

export interface ManifestEntry {
  checklistIds: string[];
  section: MainSection;
  viewFile: string;
  component: React.ComponentType<{ onNavigate: (s: MainSection) => void }> | React.ComponentType<{}> | null;
  isReal: boolean;
  hasSupabase?: boolean;
  acceptsOnNavigate?: boolean;
  notes?: string;
}

export const MODULE_MANIFEST: ManifestEntry[] = [

  // ══════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════
  {
    checklistIds: [],
    section: 'dashboard',
    viewFile: 'DashboardView.tsx',
    component: React.lazy(() => import('../components/admin/views/DashboardView').then(m => ({ default: m.DashboardView }))),
    isReal: true,
    notes: 'Dashboard principal — acceso a Logística',
  },

  // ══════════════════════════════════════════════════════
  // LOGÍSTICA — Hub
  // ══════════════════════════════════════════════════════
  {
    checklistIds: ['logistics-hub'],
    section: 'logistica',
    viewFile: 'LogisticaView.tsx',
    component: React.lazy(() => import('../components/admin/views/LogisticaView').then(m => ({ default: m.LogisticaView }))),
    isReal: false,
    notes: 'Hub de navegación logística — Envíos y Transportistas',
  },

  // ══════════════════════════════════════════════════════
  // ENVÍOS
  // ══════════════════════════════════════════════════════
  {
    checklistIds: ['logistics-shipping'],
    section: 'envios',
    viewFile: 'EnviosView.tsx',
    component: React.lazy(() => import('../components/admin/views/EnviosView').then(m => ({ default: m.EnviosView }))),
    isReal: true,
    hasSupabase: true,
    notes: 'Vista árbol PedidoMadre→EnvíosHijos · estados · multi-tramo · panel detalle + timeline (tabla: envios + envios_eventos)',
  },

  // ══════════════════════════════════════════════════════
  // TRANSPORTISTAS
  // ══════════════════════════════════════════════════════
  {
    checklistIds: ['logistics-carriers'],
    section: 'transportistas',
    viewFile: 'TransportistasView.tsx',
    component: React.lazy(() => import('../components/admin/views/TransportistasView').then(m => ({ default: m.TransportistasView }))),
    isReal: true,
    hasSupabase: true,
    notes: 'Catálogo carriers · tramos y zonas · simulador de tarifas (tabla: transportistas + tramos)',
  },
  {
    checklistIds: ['logistics-carriers'],
    section: 'organizaciones',
    viewFile: 'OrganizacionesView.tsx',
    component: React.lazy(() => import('../components/admin/views/OrganizacionesView').then(m => ({ default: m.OrganizacionesView }))),
    isReal: true,
    hasSupabase: true,
    notes: 'CRUD completo de organizaciones — vinculadas a transportistas (tabla: organizaciones)',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Set de todos los checklistIds cubiertos por vistas reales */
export const REAL_CHECKLIST_IDS = new Set<string>(
  MODULE_MANIFEST.filter(e => e.isReal).flatMap(e => e.checklistIds)
);

/** Map sección → entry del manifest */
export const MANIFEST_BY_SECTION = new Map<MainSection, ManifestEntry>(
  MODULE_MANIFEST.map(e => [e.section, e])
);
