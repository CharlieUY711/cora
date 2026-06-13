/* =====================================================
   DashboardView — Panel principal
   Módulos activos: Logística · Transportistas · Envíos
   ===================================================== */
import React from 'react';
import type { MainSection } from '../../../AdminDashboard';
import { Truck, Package, Building2, ArrowRight } from 'lucide-react';
import { useOrchestrator } from '../../../../shells/DashboardShell/app/providers/OrchestratorProvider';

interface Props { onNavigate: (s: MainSection) => void; }

const ORANGE = '#FF6835';

interface ModuleCard {
  id: MainSection;
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
  gradient: string;
}

const CARDS: ModuleCard[] = [
  {
    id: 'logistica',
    icon: Truck,
    label: 'Logística',
    description: 'Hub central de operaciones logísticas. Envíos, transportistas y seguimiento en tiempo real.',
    color: '#FF6835',
    gradient: 'linear-gradient(135deg, #FF6835 0%, #e04e20 100%)',
  },
  {
    id: 'envios',
    icon: Package,
    label: 'Envíos',
    description: 'Árbol PedidoMadre → Envíos hijos. Estados, timeline y panel de detalle por envío.',
    color: '#7C3AED',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
  },
  {
    id: 'transportistas',
    icon: Truck,
    label: 'Transportistas',
    description: 'Catálogo de carriers, tramos por zona y simulador de tarifas multi-carrier.',
    color: '#0EA5E9',
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #0369A1 100%)',
  },
  {
    id: 'organizaciones',
    icon: Building2,
    label: 'Organizaciones',
    description: 'Empresas y organizaciones vinculadas al sistema logístico.',
    color: '#059669',
    gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
  },
];

export function DashboardView({ onNavigate }: Props) {
  const { clienteNombre } = useOrchestrator();

  return (
    <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#F8F9FA', padding: '32px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111', margin: '0 0 8px' }}>
          Bienvenido, {clienteNombre} 👋
        </h1>
        <p style={{ fontSize: '15px', color: '#6B7280', margin: 0 }}>
          Sistema de gestión logística · Módulos activos
        </p>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {CARDS.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              onClick={() => onNavigate(card.id)}
              style={{
                backgroundColor: '#fff',
                borderRadius: '16px',
                border: '1px solid #E5E7EB',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px',
                  background: card.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={22} color="#fff" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111', margin: 0 }}>{card.label}</h3>
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 16px', lineHeight: '1.5' }}>
                {card.description}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: card.color, fontSize: '13px', fontWeight: 700 }}>
                Ir al módulo <ArrowRight size={14} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
