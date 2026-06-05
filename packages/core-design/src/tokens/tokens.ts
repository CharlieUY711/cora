// ═══════════════════════════════════════════════════════════════
// CORE Design System — Base Tokens v1.1
// Fuente de verdad para todo el ecosistema CORE
// Ninguna app debe definir colores, tipografías o espaciados propios.
// ═══════════════════════════════════════════════════════════════

// ── COLORES CORE ─────────────────────────────────────────────
export const colors = {

  // ── Brand primario — Navy
  navy:        '#1B3A6B',   // identidad principal, favicon
  navyDark:    '#0D2B55',   // navbar, headers oscuros
  navyDeep:    '#091E3A',   // fondos muy oscuros
  navyLight:   '#1A3F6F',   // hover sobre navy
  blue:        '#1A4F9C',   // links, CTAs
  blueLight:   '#2E6FC4',   // hover sobre blue
  bluePale:    '#D8E8F8',   // fondos info

  // ── Brand secundario — Gold
  gold:        '#C9A84C',   // acento principal, badges, highlights
  goldLight:   '#DDB96A',   // hover sobre gold
  goldDark:    '#A8893A',   // gold sobre fondo claro
  goldPale:    'rgba(201,168,76,0.12)', // fondos con tinte gold

  // ── Neutros
  white:       '#FFFFFF',
  black:       '#000000',
  grayFaint:   '#F8FAFC',
  grayLight:   '#F2F5FA',
  grayBorder:  '#C8D5E8',
  grayMid:     '#7A7A7A',
  grayBody:    '#4A4A4A',
  grayDark:    '#1A1A1A',

  // ── Dark mode base (Biblioteca, Foundation, Hub)
  dark: {
    bg:        '#0a0a0a',
    bg2:       '#111111',
    bg3:       '#161616',
    border:    '#1f1f1f',
    border2:   '#2a2a2a',
    text:      '#e5e5e5',
    text2:     '#888888',
    text3:     '#555555',
  },

  // ── Semánticos
  success:     '#1D9E75',
  successLight:'#E8F7F2',
  warning:     '#F39C12',
  warningLight:'#FEF9E7',
  danger:      '#C0392B',
  dangerLight: '#FADBD8',
  info:        '#2E6FC4',
  infoLight:   '#D8E8F8',

  // ── Second Hand (submarca)
  secondHand: {
    primary:      '#1D9E75',
    primaryHover: '#16845F',
    soft:         '#4ECBA0',
    dark:         '#0D6B4E',
    bg:           '#EEF7F2',
    pale:         '#F0FAF6',
    border:       '#A8DCC8',
  },

} as const

// ── TIPOGRAFÍA ────────────────────────────────────────────────
export const typography = {
  family: {
    base:    "Calibri, 'Segoe UI', system-ui, sans-serif",
    mono:    "'Courier New', 'Consolas', monospace",
    display: "'Bebas Neue', sans-serif",
    code:    "'JetBrains Mono', 'Fira Code', monospace",
  },
  weight: {
    regular:  400,
    medium:   500,
    semibold: 600,
    bold:     700,
    black:    800,
  },
  size: {
    xs:      '0.6rem',
    sm:      '0.75rem',
    md:      '0.875rem',
    base:    '1rem',
    lg:      '1.125rem',
    xl:      '1.25rem',
    '2xl':   '1.5rem',
    '3xl':   '2rem',
    '4xl':   '3rem',
    display: '4rem',
  },
  lineHeight: {
    tight:   1.1,
    snug:    1.2,
    normal:  1.5,
    relaxed: 1.6,
    loose:   1.8,
  },
  letterSpacing: {
    tight:   '-0.02em',
    normal:  '0',
    wide:    '0.05em',
    wider:   '0.08em',
    widest:  '0.15em',
  },
} as const

// ── ESPACIADO (base 4px) ──────────────────────────────────────
export const spacing = {
  0:  '0',
  1:  '4px',
  2:  '8px',
  3:  '12px',
  4:  '16px',
  5:  '20px',
  6:  '24px',
  7:  '28px',
  8:  '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const

// ── RADIOS ────────────────────────────────────────────────────
export const radius = {
  none:   '0',
  sm:     '4px',
  md:     '8px',
  lg:     '12px',
  xl:     '16px',
  '2xl':  '24px',
  pill:   '9999px',
  circle: '50%',
} as const

// ── SOMBRAS ───────────────────────────────────────────────────
export const shadows = {
  none:   'none',
  soft:   '0 2px 8px rgba(13,43,85,.08), 0 1px 3px rgba(13,43,85,.04)',
  medium: '0 4px 16px rgba(13,43,85,.12), 0 2px 6px rgba(13,43,85,.06)',
  strong: '0 8px 28px rgba(13,43,85,.16), 0 4px 10px rgba(13,43,85,.08)',
  card:   '0 2px 8px rgba(13,43,85,.08)',
  focus:  '0 0 0 3px rgba(46,111,196,.3)',
} as const

// ── MOTION ────────────────────────────────────────────────────
export const motion = {
  duration: {
    instant:  '0ms',
    fast:     '150ms',
    normal:   '200ms',
    slow:     '300ms',
    verySlow: '600ms',
  },
  easing: {
    default: 'ease-in-out',
    in:      'ease-in',
    out:     'ease-out',
    spring:  'cubic-bezier(0.34, 1.56, 0.64, 1)',
    linear:  'linear',
  },
  transition: {
    fast:   'all 150ms ease-in-out',
    normal: 'all 200ms ease-in-out',
    slow:   'all 300ms ease-in-out',
    color:  'color 200ms ease-in-out, background-color 200ms ease-in-out',
  },
} as const

// ── BREAKPOINTS ───────────────────────────────────────────────
export const breakpoints = {
  sm:   '640px',
  md:   '768px',
  lg:   '1024px',
  xl:   '1280px',
  '2xl':'1536px',
} as const

// ── LAYOUT ────────────────────────────────────────────────────
export const layout = {
  maxWidth:     '1400px',
  sidebarWidth: '220px',
  navbarHeight: '48px',
  paddingX:     spacing[8],
} as const

// ── COMPONENT TOKENS ─────────────────────────────────────────
export const components = {
  button: {
    height:        '32px',
    heightSm:      '28px',
    heightLg:      '40px',
    paddingX:      spacing[4],
    fontSize:      typography.size.sm,
    fontWeight:    typography.weight.bold,
    letterSpacing: typography.letterSpacing.wide,
    radius:        radius.sm,
    transition:    motion.transition.normal,
  },
  card: {
    bg:        colors.white,
    border:    colors.grayBorder,
    radius:    radius.md,
    shadow:    shadows.card,
    padding:   spacing[4],
    paddingLg: spacing[6],
  },
  input: {
    height:  '36px',
    radius:  radius.sm,
    fontSize:typography.size.md,
  },
  navbar: {
    height:   '48px',
    bgDark:   colors.navyDark,
    bgLight:  colors.white,
  },
} as const

// ── EXPORT PRINCIPAL ──────────────────────────────────────────
export const tokens = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  motion,
  breakpoints,
  layout,
  components,
} as const

export type Tokens = typeof tokens
