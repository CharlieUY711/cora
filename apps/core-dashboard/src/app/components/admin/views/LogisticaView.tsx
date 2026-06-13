/* =====================================================
   LogisticaView — Hub de Logística
   Módulos: Envíos · Transportistas · Organizaciones
   ===================================================== */
import React from 'react';
import type { MainSection } from '../../../AdminDashboard';
import { Truck, Users, Building2, Package, Clock, CheckCircle, MapPin, BarChart2, ArrowRight } from 'lucide-react';

interface Props { onNavigate: (s: MainSection) => void; }

const ORANGE = '#FF6835';

interface HubCard {
  id: MainSection;
  icon: React.ElementType;
  label: string;
  badge: string;
  description: string;
  color: string;
  gradient: string;
  stats: Array<{ icon: React.ElementType; value: string; label: string }>;
}

const CARDS: HubCard[] = [
  {
    id: 'envios',
    icon: Truck,
    label: 'Envíos',
    badge: 'Operativo',
    description: 'Tracking operativo árbol pedido madre → envíos hijos. Estados, timeline y panel de detalle por envío.',
    color: '#FF6835',
    gradient: 'linear-gradient(135deg, #FF6835 0%, #e04e20 100%)',
    stats: [
      { icon: Truck,        value: '—', label: 'Activos' },
      { icon: Clock,        value: '—', label: 'En tránsito' },
      { icon: CheckCircle,  value: '—', label: 'Entregados' },
    ],
  },
  {
    id: 'transportistas',
    icon: Users,
    label: 'Transportistas',
    badge: 'Carriers',
    description: 'Catálogo de carriers, tramos, tarifas multi-carrier local, intercity e internacional. Simulador de tarifas.',
    color: '#0EA5E9',
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #0369A1 100%)',
    stats: [
      { icon: Users,    value: '—', label: 'Carriers' },
      { icon: MapPin,   value: '—', label: 'Tramos' },
      { icon: BarChart2, value: '—', label: 'Zonas activas' },
    ],
  },
  {
    id: 'organizaciones',
    icon: Building2,
    label: 'Organizaciones',
    badge: 'Empresas',
    description: 'Empresas y organizaciones vinculadas al sistema logístico y transportistas.',
    color: '#059669',
    gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    stats: [
      { icon: Building2,    value: '—', label: 'Organizaciones' },
      { icon: CheckCircle,  value: '—', label: 'Activas' },
      { icon: Package,      value: '—', label: 'Vinculadas' },
    ],
  },
];

export function LogisticaView({ onNavigate }: Props) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#F8F9FA', padding: '32px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #FF6835 0%, #e04e20 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={20} color="#fff" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111', margin: 0 }}>Logística</h1>
        </div>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
          Envíos · Transportistas · Organizaciones
        </p>
      </div>

      {/* Cards de módulos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
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
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
              }}
            >
              {/* Banner */}
              <div style={{ height: '8px', background: card.gradient }} />

              <div style={{ padding: '20px' }}>
                {/* Icon + título */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: card.gradient,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={20} color="#fff" />
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: card.color, backgroundColor: `${card.color}18`, padding: '2px 8px', borderRadius: '8px' }}>
                      {card.badge}
                    </span>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111', margin: '4px 0 0' }}>{card.label}</h3>
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 16px', lineHeight: '1.5' }}>
                  {card.description}
                </p>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '10px' }}>
                  {card.stats.map(stat => {
                    const StatIcon = stat.icon;
                    return (
                      <div key={stat.label} style={{ flex: 1, textAlign: 'center' }}>
                        <StatIcon size={14} color="#9CA3AF" style={{ margin: '0 auto 4px' }} />
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#111' }}>{stat.value}</div>
                        <div style={{ fontSize: '10px', color: '#9CA3AF' }}>{stat.label}</div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: card.color, fontSize: '13px', fontWeight: 700 }}>
                  Ir al módulo <ArrowRight size={14} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
