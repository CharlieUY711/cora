/**
 * supabase/functions/ml-webhook/index.ts
 *
 * ACTUALIZADO: usa token desde el vault en vez de ML_ACCESS_TOKEN estático.
 * Procesa notificaciones de MercadoLibre (órdenes, items, pagos).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ML_API = "https://api.mercadolibre.com";
const TABLE  = "api_vault";

// ── Token desde vault ─────────────────────────────────────────────────────────

async function getMLToken(
  supabase: ReturnType<typeof createClient>,
  siteId = "MLU",
): Promise<string> {
  const appId = Deno.env.get("APP_ID") ?? "core-market";

  const { data: entry } = await supabase.from(TABLE)
    .select("value")
    .eq("platform", "MercadoLibre").eq("type", "oauth")
    .is("tenant_id", null)
    .contains("tags", [appId, siteId])
    .maybeSingle();

  if (!entry) throw new Error("Sin credencial ML en vault");

  const value = JSON.parse(entry.value);

  if (value.expiresAt - Date.now() < 5 * 60 * 1000) {
    const envVal = Deno.env.get(`ML_SECRETS_MERCADOLIBRE_${siteId}`);
    if (!envVal) throw new Error(`ML_SECRETS_MERCADOLIBRE_${siteId} no configurado`);
    const [mlAppId, clientSecret] = envVal.split(":");
    const res = await fetch(`${ML_API}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token", client_id: mlAppId,
        client_secret: clientSecret, refresh_token: value.refreshToken,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Refresh fallido: ${data.message}`);
    const updated = { ...value, accessToken: data.access_token,
      refreshToken: data.refresh_token ?? value.refreshToken,
      expiresAt: Date.now() + (data.expires_in ?? 21_600) * 1000 };
    await supabase.from(TABLE)
      .update({ value: JSON.stringify(updated), expires_at: new Date(updated.expiresAt).toISOString() })
      .contains("tags", [appId, siteId]).eq("platform", "MercadoLibre").eq("type", "oauth");
    return data.access_token;
  }

  return value.accessToken;
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const body = await req.json();

    const event_id = body.id || body.resource;
    const topic    = body.topic;
    const resource = body.resource;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Idempotencia
    const { data: existing } = await supabase
      .from("ml_webhook_events").select("id")
      .eq("event_id", event_id).maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ status: "ignored_duplicate" }));
    }

    await supabase.from("ml_webhook_events").insert({ event_id, topic, resource });

    // Obtener token desde vault
    let mlToken: string;
    try {
      mlToken = await getMLToken(supabase);
    } catch {
      // Si no hay token loguear y responder 200 para que ML no reintente
      console.error("[ml-webhook] Sin token en vault");
      return new Response(JSON.stringify({ status: "no_token" }));
    }

    // ── Procesar según topic ────────────────────────────────────────────────

    if (topic === "orders_v2") {
      const mlRes  = await fetch(`${ML_API}${resource}`, {
        headers: { Authorization: `Bearer ${mlToken}` },
      });
      const order = await mlRes.json();

      if (!mlRes.ok) {
        console.error("[ml-webhook] No se pudo obtener orden:", order);
        return new Response(JSON.stringify({ status: "order_fetch_error" }));
      }

      for (const orderItem of (order.order_items ?? [])) {
        const ml_item_id = orderItem.item?.id;
        const quantity   = orderItem.quantity;
        const price      = orderItem.unit_price;

        const { data: product } = await supabase
          .from("productos_market").select("id, stock")
          .eq("ml_item_id", ml_item_id).maybeSingle();

        if (!product) continue;

        // Crear orden interna
        const { data: newOrder } = await supabase.from("orders").insert({
          user_id:        null,
          total:          price * quantity,
          currency:       "UYU",
          payment_status: "paid",
          source:         "mercadolibre",
          ml_order_id:    String(order.id),
        }).select().single();

        if (newOrder) {
          await supabase.from("order_items").insert({
            order_id: newOrder.id, product_id: product.id, quantity, price,
          });
        }

        // Descontar stock y encolar sync de stock a ML
        await supabase.rpc("descontar_stock", {
          p_product_id: product.id, p_quantity: quantity,
        }).maybeSingle();

        // Encolar actualización de stock en ML
        await supabase.from("ml_sync_queue").insert({
          product_id: product.id,
          action:     "update_stock",
          status:     "pending",
          retries:    0,
        });
      }

      await supabase.from("ml_webhook_events")
        .update({ processed: true }).eq("event_id", event_id);

      return new Response(JSON.stringify({ status: "processed" }));
    }

    // topic: items → sincronizar estado del ítem
    if (topic === "items") {
      const itemId = resource?.split("/items/")?.[1]?.split("/")?.[0];
      if (itemId) {
        const { data: product } = await supabase
          .from("productos_market").select("id").eq("ml_item_id", itemId).maybeSingle();

        if (product) {
          // Encolar fetch_from_ml para actualizar estado localmente
          await supabase.from("ml_sync_queue").insert({
            product_id: product.id,
            action:     "sync_item",
            status:     "pending",
            retries:    0,
          });
        }
      }

      await supabase.from("ml_webhook_events")
        .update({ processed: true }).eq("event_id", event_id);

      return new Response(JSON.stringify({ status: "processed_item_notification" }));
    }

    // Otros topics: loguear y responder OK
    console.log(`[ml-webhook] Topic ignorado: ${topic}`);
    return new Response(JSON.stringify({ status: "ignored_topic", topic }));

  } catch (err: any) {
    console.error("[ml-webhook]", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
