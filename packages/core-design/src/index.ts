// ═══════════════════════════════════════════════════════════════
// @core/design — Public API
// Importar desde aquí en todas las apps:
//   import { tokens, brand } from '@core/design'
//   import '@core/design/globals'  (en globals.css de cada app)
// ═══════════════════════════════════════════════════════════════

export { tokens, colors, typography, spacing, radius, shadows, motion, breakpoints, layout, components } from './tokens/tokens'
export type { Tokens } from './tokens/tokens'

export { brand } from './themes/brand'
export type { Brand } from './themes/brand'
