/**
 * OrchestratorShell â Charlie Platform v1.0
 * ââââââââââââââââââââââââââââââââââââââââââ
 * Reemplaza el switch manual de AdminDashboard.
 * Lee MODULE_MANIFEST y renderiza el componente correspondiente
 * a la sección activa. Zero hardcoding.
 */

import React from 'react';
import { useOrchestrator } from '../../shells/DashboardShell/app/providers/OrchestratorProvider';
export { useOrchestrator };
import type { MainSection } from '../AdminDashboard';
import { MODULE_MANIFEST } from '../utils/moduleManifest';

interface OrchestratorShellProps {
  activeSection: MainSection;
  onNavigate: (s: MainSection) => void;
}

export function OrchestratorShell({ activeSection, onNavigate }: OrchestratorShellProps) {
  const { config } = useOrchestrator();
  const modulos = config?.modulos ?? [];
  
  const MODULOS_POR_AREA: Record<string, string[]> = {
    logistica:   ['transportistas', 'conductores', 'tramos', 'tarifas', 'logistica'],
    ecommerce:   ['ecommerce', 'productos', 'pedidos'],
    marketing:   ['marketing', 'rrss'],
    sistema:     ['herramientas', 'gestion', 'sistema', 'integraciones', 'auditoria'],
    constructor: ['constructor'],
  };
  const TOP_LEVEL = Object.keys(MODULOS_POR_AREA);
  const esTopLevel = TOP_LEVEL.includes(activeSection);
  const todosHabilitados = modulos.includes('*');
  const moduloActivo = (() => {
    if (todosHabilitados || modulos.length === 0) return true;
    if (!esTopLevel) return modulos.includes(activeSection);
    const modulosDelArea = MODULOS_POR_AREA[activeSection] ?? [];
    return modulosDelArea.some(m => modulos.includes(m));
  })();
  
  if (!moduloActivo) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', flexDirection: 'column', gap: '12px',
        color: '#888', fontFamily: 'inherit'
      }}>
        <span style={{ fontSize: '32px' }}>🔒</span>
        <p style={{ margin: 0, fontSize: '14px' }}>
          Módulo <strong>{activeSection}</strong> no habilitado para este tenant.
        </p>
      </div>
    );
  }
  const entry = MODULE_MANIFEST.find(e => e.section === activeSection);

  if (!entry || !entry.component) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        flexDirection: 'column',
        gap: '12px',
        color: '#888',
        fontFamily: 'inherit'
      }}>
        <span style={{ fontSize: '32px' }}>ð§</span>
        <p style={{ margin: 0, fontSize: '14px' }}>
          Módulo <strong>{activeSection}</strong> no encontrado en el manifest.
        </p>
      </div>
    );
  }

  const Component = entry.component;
  const acceptsOnNavigate = entry.acceptsOnNavigate !== false; // default: true
  
  const SuspenseFallback = (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', 
                  height:'100%', color:'#888', fontSize:'14px' }}>
      Cargando módulo...
    </div>
  );
  
  if (acceptsOnNavigate) {
    const ComponentWithProps = Component as React.ComponentType<{ onNavigate: (s: MainSection) => void }>;
    return (
      <React.Suspense fallback={SuspenseFallback}>
        <ComponentWithProps onNavigate={onNavigate} />
      </React.Suspense>
    );
  }
  
  // Componentes que no aceptan onNavigate
  const ComponentNoProps = Component as React.ComponentType<{}>;
  return (
    <React.Suspense fallback={SuspenseFallback}>
      <ComponentNoProps />
    </React.Suspense>
  );
}
