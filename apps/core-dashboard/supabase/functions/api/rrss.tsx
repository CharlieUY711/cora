/* =====================================================
   RRSS — Redes Sociales Backend Module
   Gestión real de credenciales Meta (Instagram + Facebook)
   Migrado de KV store a Supabase SQL
   Charlie Marketplace Builder v1.5
   ===================================================== */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";

export const rrss = new Hono();

const getSupabase = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

type Platform = "instagram" | "facebook" | "whatsapp";

interface Creds {
  appId:     string;
  appSecret: string;
  token:     string;
  accountId?: string; // Instagram
  pageId?:    string; // Facebook
  savedAt:   string;
}

interface VerifiedState {
  verified:    boolean;
  accountName: string;
  accountId:   string;
  verifiedAt:  string;
  error?:      string;
}

interface RRSSPost {
  id: string;
  platform: string;
  tipo: string;
  contenido: string | null;
  imagen_url: string | null;
  estado: string;
  programado_para: string | null;
  publicado_en: string | null;
  external_id: string | null;
  likes: number;
  alcance: number;
  comentarios: number;
  error_msg: string | null;
  created_at: string;
  updated_at: string;
}

interface RRSSMetrica {
  id: string;
  platform: string;
  fecha: string;
  seguidores: number;
  alcance: number;
  engagement: number;
  impresiones: number;
  nuevos_seguidores: number;
  created_at: string;
}

/* ── Mask secret helper ─────────────────────────────── */
function mask(val: string | undefined): string {
  if (!val) return "";
  if (val.length <= 8) return "••••••••";
  return val.slice(0, 4) + "••••••••" + val.slice(-4);
}

/* ────────────────────────────────────────────────────
   GET /rrss/status
   Returns real connection status for all platforms
   ──────────────────────────────────────────────────── */
rrss.get("/status", async (c) => {
  try {
    const supabase = getSupabase();
    const platforms: Platform[] = ["instagram", "facebook"];
    const result: Record<string, unknown> = {};

    for (const platform of platforms) {
      const { data: credsData } = await supabase
        .from("rrss_credenciales")
        .select("*")
        .eq("platform", platform)
        .maybeSingle();

      result[platform] = {
        hasCreds:    !!credsData,
        savedAt:     credsData?.saved_at ?? null,
        verified:    credsData?.verified ?? false,
        accountName: credsData?.account_name ?? null,
        accountId:   credsData?.account_id ?? null,
        verifiedAt:  credsData?.verified_at ?? null,
        error:       credsData?.verify_error ?? null,
        status: !credsData
          ? "no_creds"
          : (credsData.verified ? "connected" : "pending"),
      };
    }

    // WhatsApp — no Meta Graph integration yet, mark as coming soon
    result.whatsapp = { status: "coming_soon", hasCreds: false, verified: false };

    return c.json({ ok: true, data: result });
  } catch (err) {
    console.log("Error GET /rrss/status:", err);
    return c.json({ ok: false, error: String(err) }, 500);
  }
});

/* ────────────────────────────────────────────────────
   GET /rrss/creds/:platform
   Returns masked credentials + metadata
   ──────────────────────────────────────────────────── */
rrss.get("/creds/:platform", async (c) => {
  const platform = c.req.param("platform") as Platform;
  try {
    const supabase = getSupabase();
    const { data: credsData } = await supabase
      .from("rrss_credenciales")
      .select("*")
      .eq("platform", platform)
      .maybeSingle();

    if (!credsData) {
      return c.json({ ok: true, data: null });
    }

    return c.json({
      ok: true,
      data: {
        // Return real values so the form can display them (user already saved them)
        appId:     credsData.app_id ?? "",
        appSecret: credsData.app_secret ?? "",
        token:     credsData.token ?? "",
        accountId: credsData.account_id ?? "",
        pageId:    credsData.page_id ?? "",
        savedAt:   credsData.saved_at ?? new Date().toISOString(),
        // Masks for display in non-edit contexts
        masked: {
          appId:     mask(credsData.app_id),
          appSecret: mask(credsData.app_secret),
          token:     mask(credsData.token),
          accountId: mask(credsData.account_id),
          pageId:    mask(credsData.page_id),
        },
        verified: credsData.verified ? {
          verified:    credsData.verified,
          accountName: credsData.account_name ?? "",
          accountId:   credsData.account_id ?? "",
          verifiedAt:  credsData.verified_at ?? new Date().toISOString(),
          error:       credsData.verify_error ?? undefined,
        } : null,
      },
    });
  } catch (err) {
    console.log(`Error GET /rrss/creds/${platform}:`, err);
    return c.json({ ok: false, error: String(err) }, 500);
  }
});

/* ────────────────────────────────────────────────────
   POST /rrss/creds/:platform
   Save credentials (body: { appId, appSecret, token, accountId|pageId })
   ──────────────────────────────────────────────────── */
rrss.post("/creds/:platform", async (c) => {
  const platform = c.req.param("platform") as Platform;
  try {
    const body = await c.req.json() as Partial<Creds>;
    const supabase = getSupabase();

    if (!body.appId || !body.appSecret || !body.token) {
      return c.json({ ok: false, error: "Faltan campos requeridos: appId, appSecret, token" }, 400);
    }

    const payload = {
      platform: platform,
      app_id: body.appId.trim(),
      app_secret: body.appSecret.trim(),
      token: body.token.trim(),
      account_id: body.accountId?.trim() ?? null,
      page_id: body.pageId?.trim() ?? null,
      verified: false,
      account_name: null,
      verified_at: null,
      verify_error: null,
      saved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("rrss_credenciales")
      .upsert(payload, { onConflict: "platform" })
      .select()
      .single();

    if (error) throw error;

    console.log(`RRSS: credentials saved for ${platform}`);
    return c.json({ ok: true, savedAt: data.saved_at });
  } catch (err) {
    console.log(`Error POST /rrss/creds/${platform}:`, err);
    return c.json({ ok: false, error: String(err) }, 500);
  }
});

/* ────────────────────────────────────────────────────
   DELETE /rrss/creds/:platform
   Remove credentials + verification
   ──────────────────────────────────────────────────── */
rrss.delete("/creds/:platform", async (c) => {
  const platform = c.req.param("platform") as Platform;
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("rrss_credenciales")
      .delete()
      .eq("platform", platform);

    if (error) throw error;

    console.log(`RRSS: credentials deleted for ${platform}`);
    return c.json({ ok: true });
  } catch (err) {
    console.log(`Error DELETE /rrss/creds/${platform}:`, err);
    return c.json({ ok: false, error: String(err) }, 500);
  }
});

/* ────────────────────────────────────────────────────
   POST /rrss/verify/:platform
   Verify credentials via Meta Graph API
   Saves verification result to Supabase
   ──────────────────────────────────────────────────── */
rrss.post("/verify/:platform", async (c) => {
  const platform = c.req.param("platform") as Platform;
  try {
    const supabase = getSupabase();
    const { data: credsData } = await supabase
      .from("rrss_credenciales")
      .select("*")
      .eq("platform", platform)
      .maybeSingle();

    if (!credsData || !credsData.token) {
      return c.json({ ok: false, error: "No hay credenciales guardadas. Guardá primero." }, 400);
    }

    // Call Meta Graph API — verify Access Token
    let verifiedState: VerifiedState;
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${encodeURIComponent(credsData.token)}`
      );
      const data = await res.json() as { id?: string; name?: string; error?: { message: string; code: number } };

      if (data.error) {
        verifiedState = {
          verified:    false,
          accountName: "",
          accountId:   "",
          verifiedAt:  new Date().toISOString(),
          error:       `Meta API error ${data.error.code}: ${data.error.message}`,
        };
      } else {
        verifiedState = {
          verified:    true,
          accountName: data.name ?? "Desconocido",
          accountId:   data.id   ?? "",
          verifiedAt:  new Date().toISOString(),
        };
      }
    } catch (fetchErr) {
      verifiedState = {
        verified:    false,
        accountName: "",
        accountId:   "",
        verifiedAt:  new Date().toISOString(),
        error:       `Error de red al contactar Meta: ${String(fetchErr)}`,
      };
    }

    // Update credentials with verification result
    const { error: updateError } = await supabase
      .from("rrss_credenciales")
      .update({
        verified: verifiedState.verified,
        account_name: verifiedState.accountName,
        account_id: verifiedState.accountId,
        verified_at: verifiedState.verifiedAt,
        verify_error: verifiedState.error ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("platform", platform);

    if (updateError) throw updateError;

    console.log(`RRSS: verification for ${platform} → ${verifiedState.verified}`);
    return c.json({ ok: true, data: verifiedState });
  } catch (err) {
    console.log(`Error POST /rrss/verify/${platform}:`, err);
    return c.json({ ok: false, error: String(err) }, 500);
  }
});

/* ────────────────────────────────────────────────────
   GET /rrss/posts
   Listar posts (query: ?platform=&estado=)
   ──────────────────────────────────────────────────── */
rrss.get("/posts", async (c) => {
  try {
    const supabase = getSupabase();
    const platform = c.req.query("platform");
    const estado = c.req.query("estado");

    let query = supabase
      .from("rrss_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (platform) query = query.eq("platform", platform);
    if (estado) query = query.eq("estado", estado);

    const { data, error } = await query;
    if (error) throw error;

    return c.json({ ok: true, data: data ?? [] });
  } catch (err) {
    console.log("Error GET /rrss/posts:", err);
    return c.json({ ok: false, error: String(err) }, 500);
  }
});

/* ────────────────────────────────────────────────────
   POST /rrss/posts
   Crear post
   ──────────────────────────────────────────────────── */
rrss.post("/posts", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json() as Partial<RRSSPost>;

    if (!body.platform || !body.estado) {
      return c.json({ ok: false, error: "platform y estado son requeridos" }, 400);
    }

    const payload = {
      platform: body.platform,
      tipo: body.tipo ?? "post",
      contenido: body.contenido ?? null,
      imagen_url: body.imagen_url ?? null,
      estado: body.estado,
      programado_para: body.programado_para ?? null,
      publicado_en: body.publicado_en ?? null,
      external_id: body.external_id ?? null,
      likes: body.likes ?? 0,
      alcance: body.alcance ?? 0,
      comentarios: body.comentarios ?? 0,
      error_msg: body.error_msg ?? null,
    };

    const { data, error } = await supabase
      .from("rrss_posts")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return c.json({ ok: true, data }, 201);
  } catch (err) {
    console.log("Error POST /rrss/posts:", err);
    return c.json({ ok: false, error: String(err) }, 500);
  }
});

/* ────────────────────────────────────────────────────
   PUT /rrss/posts/:id
   Actualizar post
   ──────────────────────────────────────────────────── */
rrss.put("/posts/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const id = c.req.param("id");
    const body = await c.req.json() as Partial<RRSSPost>;

    const { data, error } = await supabase
      .from("rrss_posts")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return c.json({ ok: true, data });
  } catch (err) {
    console.log(`Error PUT /rrss/posts/${id}:`, err);
    return c.json({ ok: false, error: String(err) }, 500);
  }
});

/* ────────────────────────────────────────────────────
   DELETE /rrss/posts/:id
   Eliminar post
   ──────────────────────────────────────────────────── */
rrss.delete("/posts/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const id = c.req.param("id");

    const { error } = await supabase
      .from("rrss_posts")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return c.json({ ok: true });
  } catch (err) {
    console.log(`Error DELETE /rrss/posts/${id}:`, err);
    return c.json({ ok: false, error: String(err) }, 500);
  }
});

/* ────────────────────────────────────────────────────
   GET /rrss/metricas
   Métricas históricas (query: ?platform=&dias=7)
   ──────────────────────────────────────────────────── */
rrss.get("/metricas", async (c) => {
  try {
    const supabase = getSupabase();
    const platform = c.req.query("platform");
    const dias = parseInt(c.req.query("dias") ?? "7", 10);

    const fechaDesde = new Date();
    fechaDesde.setDate(fechaDesde.getDate() - dias);

    let query = supabase
      .from("rrss_metricas")
      .select("*")
      .gte("fecha", fechaDesde.toISOString().split("T")[0])
      .order("fecha", { ascending: true });

    if (platform) query = query.eq("platform", platform);

    const { data, error } = await query;
    if (error) throw error;

    return c.json({ ok: true, data: data ?? [] });
  } catch (err) {
    console.log("Error GET /rrss/metricas:", err);
    return c.json({ ok: false, error: String(err) }, 500);
  }
});