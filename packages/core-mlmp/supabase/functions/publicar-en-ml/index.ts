/**
 * supabase/functions/publicar-en-ml/index.ts
 *
 * ACTUALIZADO: usa token desde el vault (via ml-sync helper) en vez de
 * la variable de entorno ML_ACCESS_TOKEN estática.
 *
 * Cambia en esta función:
 *   ❌ const mlToken = Deno.env.get("ML_ACCESS_TOKEN")!
 *   ✅ const mlToken = await getMLToken(supabase, storeId, siteId)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ML_API = "https://api.mercadolibre.com";
const TABLE  = "api_vault";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Token desde vault ─────────────────────────────────────────────────────────

async function getMLToken(
  supabase: ReturnType<typeof createClient>,
  storeId: string | null = null,
  siteId = "MLU",
): Promise<string> {
  const appId = Deno.env.get("APP_ID") ?? "core-market";

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
  if (!entry) throw new Error(
    `Sin credencial MercadoLibre (${siteId}) en el vault. ` +
    `Conectá la cuenta desde Integraciones → ML & MercadoPago.`
  );

  const value = JSON.parse(entry.value);

  if (value.expiresAt - Date.now() < 5 * 60 * 1000) {
    const envVal = Deno.env.get(`ML_SECRETS_MERCADOLIBRE_${siteId}`);
    if (!envVal) throw new Error(`ML_SECRETS_MERCADOLIBRE_${siteId} no configurado`);
    const [mlAppId, clientSecret] = envVal.split(":");
    const res = await fetch(`${ML_API}/oauth/token`, {
      method:  "POST",
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
      .eq("platform", "MercadoLibre").eq("type", "oauth").contains("tags", [appId, siteId]);
    return data.access_token;
  }

  return value.accessToken;
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    const { product_id, store_id = null, site_id = "MLU" } = body;

    if (!product_id) return new Response(
      JSON.stringify({ error: "product_id requerido" }),
      { status: 400, headers: corsHeaders }
    );

    // ✅ Token desde vault — ya no ML_ACCESS_TOKEN
    let mlToken: string;
    try {
      mlToken = await getMLToken(supabase, store_id, site_id);
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), { status: 503, headers: corsHeaders });
    }

    // 1. Obtener producto
    const { data: producto, error: prodError } = await supabase
      .from("productos_market")
      .select("*, departamento_nombre")
      .eq("id", product_id)
      .single();

    if (prodError || !producto) return new Response(
      JSON.stringify({ error: "Producto no encontrado" }), { status: 404, headers: corsHeaders }
    );

    // 2. Validar stock
    if (!producto.stock || producto.stock <= 0) return new Response(
      JSON.stringify({ error: "Stock insuficiente para publicar" }), { status: 400, headers: corsHeaders }
    );

    // 3. Obtener precio
    const { data: prices } = await supabase
      .from("product_prices").select("price_ml, price_oddy")
      .eq("product_id", product_id).maybeSingle();

    const precio = prices?.price_ml ?? prices?.price_oddy ?? producto.precio;
    if (!precio) return new Response(
      JSON.stringify({ error: "Precio no configurado" }), { status: 400, headers: corsHeaders }
    );

    // 4. Obtener categoría ML
    const { data: catMap } = await supabase
      .from("ml_category_mapping").select("ml_category_id")
      .eq("oddy_category", producto.departamento_nombre).maybeSingle();

    if (!catMap) return new Response(
      JSON.stringify({ error: `Categoría "${producto.departamento_nombre}" no mapeada a ML` }),
      { status: 400, headers: corsHeaders }
    );

    // 5. Validar imágenes
    const imagenes = [
      producto.imagen_principal,
      ...(producto.imagenes_adicionales ?? []),
    ].filter(Boolean).slice(0, 10);

    if (imagenes.length === 0) return new Response(
      JSON.stringify({ error: "Se requiere al menos una imagen" }), { status: 400, headers: corsHeaders }
    );

    // 6. Construir payload ML
    const mlPayload = {
      title:              producto.nombre,
      category_id:        catMap.ml_category_id,
      price:              Number(precio),
      currency_id:        "UYU",
      available_quantity: producto.stock,
      buying_mode:        "buy_it_now",
      condition:          "new",
      listing_type_id:    producto.ml_listing_type ?? "gold_special",
      pictures:           imagenes.map((url: string) => ({ source: url })),
      description:        { plain_text: producto.descripcion || producto.nombre },
      sale_terms:         [
        { id: "WARRANTY_TYPE",  value_name: "Garantía del vendedor" },
        { id: "WARRANTY_TIME",  value_name: "90 días" },
      ],
    };

    // 7. Publicar en ML
    const mlRes = await fetch(`${ML_API}/items`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${mlToken}` },
      body:    JSON.stringify(mlPayload),
    });

    const mlData = await mlRes.json();

    if (!mlRes.ok) {
      await supabase.from("productos_market")
        .update({ sync_status: "error", ml_last_sync: new Date().toISOString() })
        .eq("id", product_id);

      await supabase.rpc("log_event", {
        p_event_type: "ml_publish_error", p_entity_type: "product",
        p_entity_id: product_id, p_payload: { error: mlData },
      }).maybeSingle();

      return new Response(
        JSON.stringify({ error: mlData.message || "Error en ML", detail: mlData }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 8. Guardar resultado exitoso
    await supabase.from("productos_market")
      .update({
        ml_item_id:   mlData.id,
        ml_status:    mlData.status,
        ml_last_sync: new Date().toISOString(),
        sync_status:  "synced",
      })
      .eq("id", product_id);

    await supabase.from("ml_listings")
      .upsert({
        product_id, ml_item_id: mlData.id, status: mlData.status,
        price: precio, last_sync: new Date().toISOString(), raw_response: mlData,
      }, { onConflict: "product_id" });

    await supabase.rpc("log_event", {
      p_event_type: "ml_published", p_entity_type: "product",
      p_entity_id: product_id, p_payload: { ml_item_id: mlData.id, status: mlData.status },
    }).maybeSingle();

    return new Response(
      JSON.stringify({ ok: true, ml_item_id: mlData.id, status: mlData.status, permalink: mlData.permalink }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[publicar-en-ml]", error);
    return new Response(JSON.stringify({ error: "Error interno" }), { status: 500, headers: corsHeaders });
  }
});
