/* =====================================================
   age_verification.tsx — Endpoints de verificación de edad
   Rutas: /age-verification/*
   ===================================================== */
import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

export const ageVerification = new Hono();

/* ── POST /save — Guardar resultado de verificación ── */
ageVerification.post("/save", async (c) => {
  try {
    const body = await c.req.json();
    const { userId, sessionId, method, age, orderNumber } = body;

    if (!userId && !sessionId) {
      return c.json({ error: "Se requiere userId o sessionId" }, 400);
    }
    if (!method || age === undefined) {
      return c.json({ error: "Faltan campos: method, age" }, 400);
    }

    const key = userId
      ? `age_verification:user:${userId}`
      : `age_verification:session:${sessionId}`;

    const expiryDays = method === "metamap" ? 90 : 30;
    const record = {
      verified:    true,
      method,
      age,
      orderNumber: orderNumber ?? null,
      verifiedAt:  new Date().toISOString(),
      expiresAt:   new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString(),
    };

    await kv.set(key, record);
    console.log(`[AgeVerification] Guardada verificación: key=${key} method=${method} age=${age}`);
    return c.json({ data: { saved: true, key, expiresAt: record.expiresAt } });

  } catch (err) {
    console.log(`[AgeVerification] Error en /save: ${err}`);
    return c.json({ error: `Error guardando verificación: ${err}` }, 500);
  }
});

/* ── GET /status — Consultar estado de verificación ── */
ageVerification.get("/status", async (c) => {
  try {
    const userId    = c.req.query("userId");
    const sessionId = c.req.query("sessionId");

    if (!userId && !sessionId) {
      return c.json({ error: "Se requiere userId o sessionId" }, 400);
    }

    const key    = userId ? `age_verification:user:${userId}` : `age_verification:session:${sessionId}`;
    const record = await kv.get(key) as any;

    if (!record || !record.verified) {
      return c.json({ data: { verified: false, status: "not_verified" } });
    }

    // Verificar expiración
    if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
      await kv.del(key);
      return c.json({ data: { verified: false, status: "expired" } });
    }

    return c.json({ data: { verified: true, status: "verified", method: record.method, age: record.age, verifiedAt: record.verifiedAt, expiresAt: record.expiresAt } });

  } catch (err) {
    console.log(`[AgeVerification] Error en /status: ${err}`);
    return c.json({ error: `Error consultando verificación: ${err}` }, 500);
  }
});

/* ── POST /metamap-webhook — Receptor de eventos MetaMap ── */
ageVerification.post("/metamap-webhook", async (c) => {
  try {
    const body       = await c.req.json();
    const signature  = c.req.header("x-signature") ?? "";
    const webhookSecret = Deno.env.get("METAMAP_WEBHOOK_SECRET") ?? "";

    // En producción: validar HMAC-SHA256 de la firma
    // const expectedSig = await computeHmac(webhookSecret, JSON.stringify(body));
    // if (signature !== expectedSig) { return c.json({ error: "Firma inválida" }, 401); }

    const { event, verification, user } = body;
    console.log(`[MetaMap Webhook] Evento: ${event} | verification: ${verification?.id}`);

    if (!event || !verification?.id) {
      return c.json({ error: "Payload inválido" }, 400);
    }

    // Guardar el resultado en KV Store
    const key    = `metamap:verification:${verification.id}`;
    const userId = user?.id ?? verification?.metadata?.userId ?? null;

    const record = {
      verificationId:  verification.id,
      event,
      status:          event === "verification.approved" ? "approved" : event === "verification.rejected" ? "rejected" : "pending",
      userId,
      flowId:          verification.flowId,
      identity:        verification.identity ?? null,
      riskLevel:       verification.riskLevel ?? null,
      processedAt:     new Date().toISOString(),
    };

    await kv.set(key, record);

    // Si está aprobado y tenemos userId, guardar verificación de usuario
    if (event === "verification.approved" && userId) {
      const userKey = `age_verification:user:${userId}`;
      await kv.set(userKey, {
        verified:   true,
        method:     "metamap",
        verifiedAt: new Date().toISOString(),
        expiresAt:  new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        verificationId: verification.id,
      });
      console.log(`[MetaMap Webhook] Usuario ${userId} verificado y guardado en KV`);
    }

    return c.json({ received: true, event });

  } catch (err) {
    console.log(`[MetaMap Webhook] Error: ${err}`);
    return c.json({ error: `Error procesando webhook: ${err}` }, 500);
  }
});

/* ── GET /recent — Listar verificaciones recientes (admin) ── */
ageVerification.get("/recent", async (c) => {
  try {
    const records = await kv.getByPrefix("metamap:verification:");
    const sorted  = (records as any[])
      .filter(r => r?.processedAt)
      .sort((a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime())
      .slice(0, 20);
    return c.json({ data: sorted });
  } catch (err) {
    console.log(`[MetaMap] Error en /recent: ${err}`);
    return c.json({ error: `Error obteniendo verificaciones: ${err}` }, 500);
  }
});


