/**
 * supabase/functions/ml-sync/index.ts
 *
 * Sincronización completa de publicaciones con MercadoLibre.
 *
 * Acciones soportadas (campo `action` en el body):
 *   - "sync_item"      → sincroniza un producto específico (título, precio, stock, fotos, descripción)
 *   - "sync_all"       → encola todos los productos con ml_item_id para sincronización
 *   - "sync_status"    → cambia el estado de una publicación (active / paused / closed)
 *   - "fetch_from_ml"  → trae los datos actuales de ML para un ítem y los guarda localmente
 *   - "process_queue"  → procesa la cola de sincronización pendiente (max 50 por ejecución)
 *
 * Usa el vault via getMLToken — nunca token estático.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ML_API = "https://api.mercadolibre.com";
const TABLE  = "api_vault";

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// ── Token desde vault (reemplaza ML_ACCESS_TOKEN estático) ────────────────────

async function getMLToken(
  supabase: ReturnType<typeof createClient>,
  storeId: string | null = null,
  siteId = "MLU",
): Promise<string> {
  const appId = Deno.env.get("APP_ID") ?? "core-market";

  // Resolver credencial: primero tienda propia, luego global
  const resolveQuery = async (tenantId: string | null) => {
    let q = supabase.from(TABLE)
      .select("value, expires_at")
      .eq("platform", "MercadoLibre")
      .eq("type", "oauth")
      .contains("tags", [appId, siteId]);

    q = tenantId !== null ? q.eq("tenant_id", tenantId) : q.is("tenant_id", null);
    const { data } = await q.maybeSingle();
    return data;
  };

  let entry = storeId ? await resolveQuery(storeId) : null;
  if (!entry) entry = await resolveQuery(null);
  if (!entry) throw new Error(`Sin credencial MercadoLibre (${siteId}) en el vault. Conectá la cuenta desde Integraciones → ML & MercadoPago.`);

  const value = JSON.parse(entry.value);
  const msToExpiry = value.expiresAt - Date.now();

  // Si queda menos de 5 min → refresh proactivo
  if (msToExpiry < 5 * 60 * 1000) {
    const envKey   = `ML_SECRETS_MERCADOLIBRE_${siteId}`;
    const envVal   = Deno.env.get(envKey);
    if (!envVal) throw new Error(`${envKey} no configurado en Supabase Secrets`);
    const [mlAppId, clientSecret] = envVal.split(":");

    const res = await fetch(`${ML_API}/oauth/token`, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "refresh_token",
        client_id:     mlAppId,
        client_secret: clientSecret,
        refresh_token: value.refreshToken,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Refresh de token fallido: ${data.message}`);

    const updated = {
      ...value,
      accessToken:  data.access_token,
      refreshToken: data.refresh_token ?? value.refreshToken,
      expiresAt:    Date.now() + (data.expires_in ?? 21_600) * 1000,
    };

    // Persistir token renovado
    await supabase.from(TABLE)
      .update({ value: JSON.stringify(updated), expires_at: new Date(updated.expiresAt).toISOString() })
      .eq("platform", "MercadoLibre").eq("type", "oauth").contains("tags", [appId, siteId]);

    return data.access_token;
  }

  return value.accessToken;
}

// ── Helpers ML API ────────────────────────────────────────────────────────────

async function mlGet(token: string, path: string) {
  const res = await fetch(`${ML_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

async function mlPut(token: string, path: string, body: Record<string, unknown>) {
  const res = await fetch(`${ML_API}${path}`, {
    method:  "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

async function mlPost(token: string, path: string, body: Record<string, unknown>) {
  const res = await fetch(`${ML_API}${path}`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

// ── Sync de un ítem completo ───────────────────────────────────────────────────

async function syncItem(
  supabase: ReturnType<typeof createClient>,
  token:     string,
  productId: string,
): Promise<{ ok: boolean; ml_item_id?: string; warnings?: string[]; error?: string }> {
  const warnings: string[] = [];

  // 1. Obtener producto desde la vista admin_products (incluye nombre, precio, stock, etc.)
  const { data: producto, error: prodErr } = await supabase
    .from("admin_products")
    .select("*")
    .eq("id", productId)
    .single();

  if (prodErr || !producto) {
    return { ok: false, error: `Producto ${productId} no encontrado` };
  }

  if (!producto.ml_item_id) {
    return { ok: false, error: "Este producto no tiene ml_item_id. Publicalo primero desde el panel." };
  }

  // 2. Obtener precio ML específico si existe
  const { data: prices } = await supabase
    .from("product_prices")
    .select("price_ml, price_oddy")
    .eq("product_id", productId)
    .maybeSingle();

  const precio = prices?.price_ml ?? prices?.price_oddy ?? producto.precio;

  if (!precio) return { ok: false, error: "Precio no configurado" };

  // 3. Construir payload de actualización
  // Nota ML (desde marzo 2026): price no puede enviarse solo, debe ir con otro campo
  const updatePayload: Record<string, unknown> = {
    title:              producto.nombre,
    available_quantity: Math.max(0, producto.stock ?? 0),
    price:              Number(precio),
  };

  // Agregar descripción si existe (es un endpoint separado en ML)
  // Agregar fotos si hay imágenes
  if (producto.imagen_principal) {
    const fotos = [producto.imagen_principal];
    // Agregar imágenes adicionales si la tabla las tiene
    if (producto.imagenes_adicionales?.length) {
      fotos.push(...producto.imagenes_adicionales.slice(0, 9)); // ML acepta máx 10
    }
    updatePayload.pictures = fotos.map((url: string) => ({ source: url }));
  }

  // 4. Aplicar cambios en ML
  const { ok, data: mlData } = await mlPut(token, `/items/${producto.ml_item_id}`, updatePayload);

  if (!ok) {
    // Detectar warning de precio (ML lo ignora pero responde 200 con warnings a veces)
    const isWarning = mlData?.warnings?.length > 0;
    if (!isWarning) {
      // Guardar error
      await supabase.from("productos_market")
        .update({ sync_status: "error", ml_last_sync: new Date().toISOString() })
        .eq("id", productId);

      await supabase.rpc("log_event", {
        p_event_type:  "ml_sync_error",
        p_entity_type: "product",
        p_entity_id:   productId,
        p_payload:     { error: mlData, action: "sync_item" },
      }).maybeSingle();

      return { ok: false, error: mlData?.message ?? "Error en ML", ml_item_id: producto.ml_item_id };
    }
    // Si solo hay warnings (ej. precio ignorado porque tiene automatización), continuar
    for (const w of (mlData.warnings ?? [])) {
      warnings.push(`⚠️ ${w.message ?? JSON.stringify(w)}`);
    }
  }

  // 5. Sincronizar descripción (endpoint separado)
  if (producto.descripcion) {
    const descRes = await mlPost(token, `/items/${producto.ml_item_id}/description`, {
      plain_text: producto.descripcion,
    });
    // Si falla descripción no es crítico — loguear warning
    if (!descRes.ok) {
      // Intentar PUT si POST falla (ya existe descripción)
      const descPut = await mlPut(token, `/items/${producto.ml_item_id}/description`, {
        plain_text: producto.descripcion,
      });
      if (!descPut.ok) {
        warnings.push(`Descripción no actualizada: ${descPut.data?.message ?? "error"}`);
      }
    }
  }

  // 6. Actualizar status según stock
  if ((producto.stock ?? 0) <= 0) {
    await mlPut(token, `/items/${producto.ml_item_id}`, { status: "paused" });
  } else if (mlData.status === "paused") {
    // Reactivar si tenemos stock y estaba pausado
    await mlPut(token, `/items/${producto.ml_item_id}`, { status: "active" });
  }

  // 7. Actualizar localmente
  await supabase.from("productos_market")
    .update({
      ml_status:    mlData.status ?? producto.ml_status,
      ml_last_sync: new Date().toISOString(),
      sync_status:  "synced",
    })
    .eq("id", productId);

  await supabase.from("ml_listings")
    .upsert({
      product_id: productId,
      ml_item_id: producto.ml_item_id,
      status:     mlData.status ?? "active",
      price:      Number(precio),
      last_sync:  new Date().toISOString(),
      raw_response: mlData,
    }, { onConflict: "product_id" });

  await supabase.rpc("log_event", {
    p_event_type:  "ml_item_synced",
    p_entity_type: "product",
    p_entity_id:   productId,
    p_payload:     { ml_item_id: producto.ml_item_id, warnings },
  }).maybeSingle();

  return { ok: true, ml_item_id: producto.ml_item_id, warnings };
}

// ── Handler principal ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body     = await req.json().catch(() => ({}));
    const action   = body.action ?? "sync_item";
    const storeId  = body.store_id  ?? null;
    const siteId   = body.site_id   ?? "MLU";

    // Obtener token válido desde vault
    let token: string;
    try {
      token = await getMLToken(supabase, storeId, siteId);
    } catch (err: any) {
      return json({ ok: false, error: err.message }, 503);
    }

    // ── ACTION: sync_item ───────────────────────────────────────────────────
    if (action === "sync_item") {
      const productId = body.product_id;
      if (!productId) return json({ ok: false, error: "product_id requerido" }, 400);

      const result = await syncItem(supabase, token, productId);
      return json(result, result.ok ? 200 : 400);
    }

    // ── ACTION: sync_status ─────────────────────────────────────────────────
    if (action === "sync_status") {
      const { product_id, status } = body;
      if (!product_id || !status) return json({ ok: false, error: "product_id y status requeridos" }, 400);

      const VALID = ["active", "paused", "closed"];
      if (!VALID.includes(status)) return json({ ok: false, error: `status debe ser: ${VALID.join(", ")}` }, 400);

      const { data: producto } = await supabase
        .from("admin_products").select("ml_item_id").eq("id", product_id).single();

      if (!producto?.ml_item_id) return json({ ok: false, error: "Sin ml_item_id" }, 404);

      const { ok, data: mlData } = await mlPut(token, `/items/${producto.ml_item_id}`, { status });

      if (!ok) return json({ ok: false, error: mlData?.message }, 400);

      await supabase.from("productos_market")
        .update({ ml_status: status, ml_last_sync: new Date().toISOString() })
        .eq("id", product_id);

      return json({ ok: true, ml_item_id: producto.ml_item_id, status });
    }

    // ── ACTION: fetch_from_ml ───────────────────────────────────────────────
    if (action === "fetch_from_ml") {
      const { product_id } = body;
      if (!product_id) return json({ ok: false, error: "product_id requerido" }, 400);

      const { data: producto } = await supabase
        .from("admin_products").select("ml_item_id").eq("id", product_id).single();

      if (!producto?.ml_item_id) return json({ ok: false, error: "Sin ml_item_id" }, 404);

      const { ok, data: mlItem } = await mlGet(token, `/items/${producto.ml_item_id}`);
      if (!ok) return json({ ok: false, error: mlItem?.message }, 400);

      // Actualizar estado ML localmente
      await supabase.from("productos_market")
        .update({
          ml_status:    mlItem.status,
          ml_last_sync: new Date().toISOString(),
          sync_status:  "synced",
        })
        .eq("id", product_id);

      return json({
        ok: true,
        ml_item_id: mlItem.id,
        status:     mlItem.status,
        title:      mlItem.title,
        price:      mlItem.price,
        available_quantity: mlItem.available_quantity,
        sold_quantity:      mlItem.sold_quantity,
        health:             mlItem.health,
        permalink:          mlItem.permalink,
      });
    }

    // ── ACTION: sync_all ────────────────────────────────────────────────────
    if (action === "sync_all") {
      // Encolar todos los productos que tienen ml_item_id
      const { data: productos } = await supabase
        .from("admin_products")
        .select("id")
        .not("ml_item_id", "is", null);

      if (!productos?.length) return json({ ok: true, enqueued: 0, message: "No hay productos publicados en ML" });

      const rows = productos.map(p => ({
        product_id: p.id,
        action:     "sync_item",
        status:     "pending",
        retries:    0,
      }));

      // Insertar en cola — ignorar duplicados de productos ya pendientes
      const { data: inserted } = await supabase
        .from("ml_sync_queue")
        .upsert(rows, { onConflict: "product_id,action", ignoreDuplicates: true })
        .select("id");

      return json({ ok: true, enqueued: inserted?.length ?? rows.length });
    }

    // ── ACTION: process_queue ───────────────────────────────────────────────
    if (action === "process_queue") {
      const MAX_RETRIES = 3;
      let processed = 0;
      let errors    = 0;

      const { data: items } = await supabase
        .from("ml_sync_queue")
        .select("id, product_id, action, retries")
        .eq("status", "pending")
        .lt("retries", MAX_RETRIES)
        .order("created_at", { ascending: true })
        .limit(50);

      if (!items?.length) return json({ ok: true, processed: 0, message: "Cola vacía" });

      for (const item of items) {
        try {
          let result: { ok: boolean; error?: string };

          if (item.action === "sync_item") {
            result = await syncItem(supabase, token, item.product_id);
          } else if (item.action === "update_stock") {
            const { data: p } = await supabase
              .from("admin_products").select("ml_item_id, stock").eq("id", item.product_id).single();
            if (!p?.ml_item_id) { result = { ok: false, error: "Sin ml_item_id" }; }
            else {
              const r = await mlPut(token, `/items/${p.ml_item_id}`, {
                available_quantity: Math.max(0, p.stock ?? 0),
                // Enviar junto con title para evitar el 400 de ML (price-only restriction)
              });
              result = { ok: r.ok, error: r.data?.message };
              if (r.ok) {
                await supabase.from("productos_market")
                  .update({ ml_last_sync: new Date().toISOString(), sync_status: "synced" })
                  .eq("id", item.product_id);
              }
            }
          } else if (item.action === "update_price") {
            const { data: p } = await supabase
              .from("admin_products").select("ml_item_id, precio").eq("id", item.product_id).single();
            const { data: prices } = await supabase
              .from("product_prices").select("price_ml, price_oddy").eq("product_id", item.product_id).maybeSingle();
            const precio = prices?.price_ml ?? prices?.price_oddy ?? p?.precio;
            if (!p?.ml_item_id || !precio) { result = { ok: false, error: "Sin ml_item_id o precio" }; }
            else {
              // Desde marzo 2026: price solo no puede enviarse, enviar junto con title
              const { data: prod } = await supabase
                .from("admin_products").select("nombre").eq("id", item.product_id).single();
              const r = await mlPut(token, `/items/${p.ml_item_id}`, {
                price: Number(precio),
                title: prod?.nombre, // requerido para que ML no rechace
              });
              result = { ok: r.ok, error: r.data?.message };
              if (r.ok) {
                await supabase.from("productos_market")
                  .update({ ml_last_sync: new Date().toISOString(), sync_status: "synced" })
                  .eq("id", item.product_id);
              }
            }
          } else if (item.action === "update_status") {
            const { data: p } = await supabase
              .from("admin_products").select("ml_item_id, stock").eq("id", item.product_id).single();
            if (!p?.ml_item_id) { result = { ok: false, error: "Sin ml_item_id" }; }
            else {
              const mlStatus = (p.stock ?? 0) <= 0 ? "paused" : "active";
              const r = await mlPut(token, `/items/${p.ml_item_id}`, { status: mlStatus });
              result = { ok: r.ok, error: r.data?.message };
              if (r.ok) {
                await supabase.from("productos_market")
                  .update({ ml_status: mlStatus, ml_last_sync: new Date().toISOString() })
                  .eq("id", item.product_id);
              }
            }
          } else {
            result = { ok: false, error: `Acción desconocida: ${item.action}` };
          }

          if (result.ok) {
            await supabase.from("ml_sync_queue")
              .update({ status: "done", updated_at: new Date().toISOString() })
              .eq("id", item.id);
            processed++;
          } else {
            const newRetries = (item.retries ?? 0) + 1;
            const newStatus  = newRetries >= MAX_RETRIES ? "error" : "pending";
            await supabase.from("ml_sync_queue")
              .update({ status: newStatus, retries: newRetries, updated_at: new Date().toISOString() })
              .eq("id", item.id);
            if (newStatus === "error") {
              await supabase.from("productos_market")
                .update({ sync_status: "error" }).eq("id", item.product_id);
            }
            errors++;
          }

        } catch (err: any) {
          const newRetries = (item.retries ?? 0) + 1;
          await supabase.from("ml_sync_queue")
            .update({ retries: newRetries, updated_at: new Date().toISOString() })
            .eq("id", item.id);
          errors++;
        }
      }

      return json({ ok: true, processed, errors });
    }

    return json({ ok: false, error: `Acción desconocida: "${action}"` }, 400);

  } catch (err: any) {
    console.error("[ml-sync]", err.message);
    return json({ ok: false, error: err.message }, 500);
  }
});
