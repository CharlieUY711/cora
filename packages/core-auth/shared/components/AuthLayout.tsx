'use client'

// ═══════════════════════════════════════════════════════════════
// @core/auth — AuthLayout
// Layout compartido para todas las pantallas de auth.
// Soporta estética 1 (dark) y estética 2 (light/marketplace).
// ═══════════════════════════════════════════════════════════════

import React from 'react'

export type AuthAesthetic = 'dark' | 'light'

export interface AuthLayoutProps {
  children: React.ReactNode
  aesthetic?: AuthAesthetic
  // Nombre del producto que aparece en el header (ej: "BIBLIOTECA", "MARKET")
  productName?: string
  // Subtítulo debajo del nombre (ej: "by CORE")
  productByline?: string
  // Letra inicial para el favicon cuadrado (ej: "B", "M")
  productInitial?: string
  // Color de fondo del ícono (default: según estética)
  productIconBg?: string
  // Footer label (ej: "Confidencial — Uso interno")
  footerLabel?: string
  // Mostrar switcher de idioma
  showLangSwitcher?: boolean
  locale?: string
  onLocaleChange?: (locale: string) => void
}

export function AuthLayout({
  children,
  aesthetic = 'dark',
  productName = 'CORE',
  productByline = 'Global Supply. Regional Growth.',
  productInitial = 'C',
  productIconBg,
  footerLabel,
  showLangSwitcher = false,
  locale = 'es',
  onLocaleChange,
}: AuthLayoutProps) {
  const isDark = aesthetic === 'dark'

  const iconBg = productIconBg ?? (isDark ? '#1b5ac4' : '#1D9E75')

  const styles = isDark ? darkStyles : lightStyles

  return (
    <div style={styles.root}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Product icon */}
          <div style={{ ...styles.icon, backgroundColor: iconBg }}>
            <span style={styles.iconText}>{productInitial}</span>
          </div>
          <div>
            <div style={styles.productName}>{productName}</div>
            <div style={styles.productByline}>{productByline}</div>
          </div>
        </div>

        {/* Language switcher */}
        {showLangSwitcher && (
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['es', 'en', 'pt'] as const).map((l) => (
              <button
                key={l}
                onClick={() => onLocaleChange?.(l)}
                style={{
                  ...styles.langBtn,
                  ...(locale === l ? styles.langBtnActive : {}),
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={styles.content}>
        <div style={styles.card}>
          {children}
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <span style={styles.footerText}>v1.0 — 2026</span>
        <span style={styles.footerText}>
          {footerLabel ?? (isDark ? 'Confidencial — Uso interno' : 'CORE · Global Supply. Regional Growth.')}
        </span>
        <span style={styles.footerText}>CORE — Global Supply. Regional Growth.</span>
      </div>
    </div>
  )
}

// ── Estilos estética 1 — Dark ─────────────────────────────────
const darkStyles = {
  root: {
    minHeight: '100vh',
    backgroundColor: '#0A1F3D',
    color: '#ffffff',
    fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
    display: 'flex',
    flexDirection: 'column' as const,
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 32px',
    borderBottom: '1px solid #1e3354',
  },
  icon: {
    width: '32px',
    height: '32px',
    borderRadius: '7px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: '#fff',
    fontSize: '16px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
  },
  productName: {
    fontSize: '13px',
    fontWeight: '700',
    letterSpacing: '0.1em',
    color: '#ffffff',
    lineHeight: 1.2,
  },
  productByline: {
    fontSize: '10px',
    fontFamily: "'Geist Mono', monospace",
    color: '#4a6080',
    letterSpacing: '0.05em',
  },
  langBtn: {
    fontSize: '10px',
    fontFamily: "'Geist Mono', monospace",
    padding: '3px 8px',
    borderRadius: '4px',
    border: '1px solid #1e3354',
    background: 'transparent',
    color: '#4a6080',
    cursor: 'pointer',
  },
  langBtnActive: {
    borderColor: '#c9993a',
    color: '#c9993a',
    background: 'rgba(201,153,58,0.08)',
  },
  content: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 32px',
    borderTop: '1px solid #1e3354',
  },
  footerText: {
    fontSize: '10px',
    fontFamily: "'Geist Mono', monospace",
    color: '#4a6080',
  },
}

// ── Estilos estética 2 — Light ────────────────────────────────
const lightStyles = {
  root: {
    minHeight: '100vh',
    backgroundColor: '#f0f4f8',
    color: '#0D2B55',
    fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
    display: 'flex',
    flexDirection: 'column' as const,
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 32px',
    backgroundColor: '#1D9E75',
    borderBottom: 'none',
  },
  icon: {
    width: '32px',
    height: '32px',
    borderRadius: '7px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  iconText: {
    color: '#fff',
    fontSize: '16px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
  },
  productName: {
    fontSize: '13px',
    fontWeight: '700',
    letterSpacing: '0.1em',
    color: '#ffffff',
    lineHeight: 1.2,
  },
  productByline: {
    fontSize: '10px',
    fontFamily: "'Geist Mono', monospace",
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: '0.05em',
  },
  langBtn: {
    fontSize: '10px',
    fontFamily: "'Geist Mono', monospace",
    padding: '3px 8px',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.3)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
  },
  langBtnActive: {
    borderColor: '#ffffff',
    color: '#ffffff',
    background: 'rgba(255,255,255,0.2)',
  },
  content: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 16px',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 32px',
    borderTop: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
  },
  footerText: {
    fontSize: '10px',
    fontFamily: "'Geist Mono', monospace",
    color: '#94a3b8',
  },
}
