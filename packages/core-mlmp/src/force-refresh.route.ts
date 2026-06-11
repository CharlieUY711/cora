/**
 * force-refresh.route.ts
 * Tool: tool-MLMP
 *
 * Endpoint para el botón "Renovar" del panel de integraciones.
 * Encaja con TokenManager.forceRefresh() existente.
 *
 * POST /api/ml/force-refresh
 * Body: { storeId?: string | null, platform: MLProvider, siteId?: MLSiteId }
 *
 * Responde:
 *   200 { ok: true,  expiresAt: number, expiresIn: number, nickname?: string }
 *   400 { ok: false, error: string, code: MLErrorCode }
 *   500 { ok: false, error: string, code: MLErrorCode }
 */

import type { MLProvider, MLSiteId, MLResult } from './index.ts'
import { MLModuleError }                        from './index.ts'
import { TokenManager }                         from './TokenManager.ts'

// ─── Tipos del endpoint ───────────────────────────────────────────────────────

export interface ForceRefreshBody {
  /** null = cuenta global del marketplace */
  storeId?:  string | null
  platform:  MLProvider
  siteId?:   MLSiteId
}

export interface ForceRefreshData {
  expiresAt: number
  expiresIn: number   // segundos hasta vencimiento
  nickname?: string
}

// ─── Handler puro ─────────────────────────────────────────────────────────────
// Recibe el TokenManager ya instanciado (lo crea el server con su supabase/config)

export async function handleForceRefresh(
  body:    ForceRefreshBody,
  manager: TokenManager,
): Promise<{ status: number; body: MLResult<ForceRefreshData> }> {

  // Validar body
  if (!body.platform || !['MercadoLibre', 'MercadoPago'].includes(body.platform)) {
    return {
      status: 400,
      body: { ok: false, error: 'platform inválido. Debe ser MercadoLibre o MercadoPago', code: 'INVALID_CONFIG' },
    }
  }

  const key = {
    storeId:  body.storeId  ?? null,
    platform: body.platform,
    siteId:   body.siteId   ?? 'MLU',
  }

  try {
    // Forzar refresh — si el token está vencido, lo renueva; si no, igual lo renueva
    await manager.forceRefresh(key)

    // Leer el estado actualizado para devolverlo al panel
    const statuses = await manager.getStatus(key.storeId)
    const entry    = statuses.find(
      s => s.platform === key.platform && s.siteId === key.siteId
    )

    return {
      status: 200,
      body: {
        ok:   true,
        data: {
          expiresAt: entry?.expiresAt  ?? Date.now() + 21_600_000,
          expiresIn: entry ? Math.round(entry.expiresIn / 1000) : 21600,
          nickname:  entry?.nickname,
        },
      },
    }
  } catch (err) {
    if (err instanceof MLModuleError) {
      const status = err.code === 'NO_CREDENTIAL' ? 400 : 500
      return {
        status,
        body: { ok: false, error: err.message, code: err.code },
      }
    }
    return {
      status: 500,
      body: { ok: false, error: (err as Error).message, code: 'API_ERROR' },
    }
  }
}


// ─── Adaptadores por framework ────────────────────────────────────────────────
// Usá el que corresponda según tu server. El handler de arriba es el mismo.

// ── Express ───────────────────────────────────────────────────────────────────
//
// import express from 'express'
// import { TokenManager } from './TokenManager.ts'
//
// export function mlForceRefreshRouter(manager: TokenManager) {
//   const router = express.Router()
//   router.post('/api/ml/force-refresh', async (req, res) => {
//     const { status, body } = await handleForceRefresh(req.body, manager)
//     res.status(status).json(body)
//   })
//   return router
// }

// ── Hono (Cloudflare Workers / Deno) ─────────────────────────────────────────
//
// import { Hono } from 'hono'
// export function mlForceRefreshRoute(manager: TokenManager) {
//   const app = new Hono()
//   app.post('/api/ml/force-refresh', async (c) => {
//     const body = await c.req.json()
//     const { status, body: resBody } = await handleForceRefresh(body, manager)
//     return c.json(resBody, status)
//   })
//   return app
// }

// ── Supabase Edge Function ────────────────────────────────────────────────────
//
// import { serve } from 'https://deno.land/std/http/server.ts'
// serve(async (req) => {
//   const body = await req.json()
//   const manager = buildTokenManager()   // tu factory
//   const { status, body: resBody } = await handleForceRefresh(body, manager)
//   return new Response(JSON.stringify(resBody), {
//     status,
//     headers: { 'Content-Type': 'application/json' },
//   })
// })


// ─── Llamada desde el frontend (botón "Renovar") ──────────────────────────────
//
// async function renovarToken(platform: MLProvider, storeId?: string) {
//   const res = await fetch('/api/ml/force-refresh', {
//     method:  'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ platform, storeId: storeId ?? null, siteId: 'MLU' }),
//   })
//   const data = await res.json()
//   if (!data.ok) throw new Error(data.error)
//   return data  // { expiresAt, expiresIn, nickname }
// }
