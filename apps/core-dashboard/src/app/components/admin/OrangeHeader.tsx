/**
 * OrangeHeader — Header estándar de módulo
 * v3.0 — Estilo blanco con badge naranja gradiente
 * Compatible hacia atrás: misma API, cero cambios en las vistas.
 */
import React from 'react';
import { Lightbulb, MapPin } from 'lucide-react';
const ORANGE = '#FF6835';

export interface HeaderAction {
  label: React.ReactNode;
  primary?: boolean;
  onClick?: () => void;
}

interface Props {
  title: React.ReactNode;
  subtitle?: string;
  actions?: HeaderAction[];
  rightSlot?: React.ReactNode;
  /** Icono Lucide a mostrar en el badge naranja izquierdo */
  icon?: React.ElementType;
  /** Callback para el icono de lamparita (ideas) */
  onIdeaClick?: () => void;
  /** Callback para el icono de geolocalización (mapas) */
  onMapClick?: () => void;
  /** Función de navegación - si está disponible, los iconos siempre aparecen */
  onNavigate?: (section: string) => void;
}

export function OrangeHeader({ title, subtitle, actions, rightSlot, icon: Icon, onIdeaClick, onMapClick, onNavigate }: Props) {
  return (
    <header
      style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E9ECEF',
        padding: '0 28px',
        height: '88px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexShrink: 0,
      }}
    >
      {/* ── Izquierda: badge + título ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>

        {/* Badge naranja */}
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: `linear-gradient(135deg, ${ORANGE} 0%, #ff8c42 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {Icon ? (
            <Icon size={18} color="#fff" strokeWidth={2.4} />
          ) : (
            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#fff', lineHeight: 1 }}>
              {typeof title === 'string' ? title.replace(/[^a-zA-ZÀ-ÿ]/g, '').charAt(0).toUpperCase() : '●'}
            </span>
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: '800',
              color: '#1A1A2E',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                margin: '3px 0 0',
                fontSize: '0.8rem',
                color: '#6C757D',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* ── Derecha: slot libre + iconos de estado + botones ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {rightSlot}
        
        {/* Botón Ideas - siempre visible */}
        <button
          onClick={onIdeaClick || (onNavigate ? () => onNavigate('ideas-board') : undefined)}
          disabled={!onNavigate && !onIdeaClick}
          title={onNavigate || onIdeaClick ? "Nueva Idea / Ideas Board" : "Ideas Board (no disponible)"}
          style={{
            width: 38, height: 38, borderRadius: '50%',
            border: `2px solid ${ORANGE}40`,
            backgroundColor: (onNavigate || onIdeaClick) ? `${ORANGE}08` : `${ORANGE}04`,
            opacity: (onNavigate || onIdeaClick) ? 1 : 0.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: (onNavigate || onIdeaClick) ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s', flexShrink: 0,
          }}
          onMouseEnter={e => {
            if (onNavigate || onIdeaClick) {
              e.currentTarget.style.backgroundColor = `${ORANGE}20`;
            }
          }}
          onMouseLeave={e => {
            if (onNavigate || onIdeaClick) {
              e.currentTarget.style.backgroundColor = `${ORANGE}08`;
            }
          }}
        >
          <Lightbulb size={17} color={ORANGE} strokeWidth={2.2} />
        </button>
        
        {/* Botón Google Maps - siempre visible */}
        <button
          onClick={onMapClick || (onNavigate ? () => onNavigate('google-maps-test') : undefined)}
          disabled={!onNavigate && !onMapClick}
          title={onNavigate || onMapClick ? "Prueba Google Maps" : "Google Maps (no disponible)"}
          style={{
            width: 38, height: 38, borderRadius: '50%',
            border: '2px solid #10B98140',
            backgroundColor: (onNavigate || onMapClick) ? '#10B98108' : '#10B98104',
            opacity: (onNavigate || onMapClick) ? 1 : 0.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: (onNavigate || onMapClick) ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s', flexShrink: 0,
          }}
          onMouseEnter={e => {
            if (onNavigate || onMapClick) {
              e.currentTarget.style.backgroundColor = '#10B98120';
            }
          }}
          onMouseLeave={e => {
            if (onNavigate || onMapClick) {
              e.currentTarget.style.backgroundColor = '#10B98108';
            }
          }}
        >
          <MapPin size={17} color="#10B981" strokeWidth={2.2} />
        </button>
        
        {/* Estado de conexión con backend */}
        {actions && actions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: action.primary ? 'none' : '1.5px solid #DEE2E6',
              backgroundColor: action.primary ? ORANGE : '#F8F9FA',
              color: action.primary ? '#FFFFFF' : '#495057',
              fontSize: '0.82rem',
              fontWeight: action.primary ? '700' : '600',
              cursor: 'pointer',
              transition: 'all 0.12s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.backgroundColor = action.primary ? '#e04e20' : '#E9ECEF';
              if (!action.primary) el.style.borderColor = '#ADB5BD';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.backgroundColor = action.primary ? ORANGE : '#F8F9FA';
              if (!action.primary) el.style.borderColor = '#DEE2E6';
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </header>
  );
}