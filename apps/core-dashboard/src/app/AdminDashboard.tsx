/* =====================================================
   Charlie Marketplace Builder — AdminDashboard
   Shell principal — Orquestador dinámico
   Módulos activos: Logística · Transportistas · Envíos
   ===================================================== */

import React, { useState, useEffect } from 'react';
import { AdminSidebar }      from './components/admin/AdminSidebar';
import { OrchestratorShell } from './components/OrchestratorShell';
import { Toaster }           from 'sonner';
import { useOrchestrator } from '../shells/DashboardShell/app/providers/OrchestratorProvider';

export type MainSection =
  | 'dashboard'
  | 'logistica'
  | 'envios'
  | 'transportistas'
  | 'organizaciones';

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<MainSection>('dashboard');
  const nav = (s: MainSection) => setActiveSection(s);
  const { clienteNombre } = useOrchestrator();

  useEffect(() => {
    if (clienteNombre) {
      document.title = clienteNombre;
    }
  }, [clienteNombre]);

  return (
    <>
      <Toaster position="top-right" richColors />
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#F8F9FA', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif' }}>
        <AdminSidebar activeSection={activeSection} onNavigate={nav} />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <OrchestratorShell activeSection={activeSection} onNavigate={nav} />
        </main>
      </div>
    </>
  );
}
