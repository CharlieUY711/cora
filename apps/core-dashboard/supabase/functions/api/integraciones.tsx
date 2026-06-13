import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";

const integraciones = new Hono();

const getSupabase = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

const errMsg = (e: unknown): string =>
  e instanceof Error
    ? e.message
    : typeof e === "object" && e !== null && "message" in e
    ? String((e as { message: unknown }).message)
    : JSON.stringify(e);

// Helper para hashear API keys
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// GET /integraciones
integraciones.get("/", async (c) => {
  try {
    const supabase = getSupabase();
    const { tipo, estado } = c.req.query();

    let query = supabase
      .from("integraciones")
      .select("*")
      .order("nombre", { ascending: true });

    if (tipo) query = query.eq("tipo", tipo);
    if (estado) query = query.eq("estado", estado);

    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error listando integraciones:", JSON.stringify(error));
    return c.json({ error: `Error listando integraciones: ${errMsg(error)}` }, 500);
  }
});

// GET /integraciones/:id
integraciones.get("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("integraciones")
      .select("*")
      .eq("id", c.req.param("id"))
      .single();

    if (error) throw error;
    if (!data) return c.json({ error: "Integración no encontrada" }, 404);
    return c.json({ data });
  } catch (error) {
    console.log("Error obteniendo integración:", JSON.stringify(error));
    return c.json({ error: `Error obteniendo integración: ${errMsg(error)}` }, 500);
  }
});

// PUT /integraciones/:id
integraciones.put("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("integraciones")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", c.req.param("id"))
      .select()
      .single();

    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error actualizando integración:", JSON.stringify(error));
    return c.json({ error: `Error actualizando integración: ${errMsg(error)}` }, 500);
  }
});

// GET /integraciones/:id/logs
integraciones.get("/:id/logs", async (c) => {
  try {
    const supabase = getSupabase();
    const { limit = "50" } = c.req.query();

    const { data, error } = await supabase
      .from("integraciones_logs")
      .select("*")
      .eq("integracion_id", c.req.param("id"))
      .order("created_at", { ascending: false })
      .limit(parseInt(limit, 10));

    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error obteniendo logs:", JSON.stringify(error));
    return c.json({ error: `Error obteniendo logs: ${errMsg(error)}` }, 500);
  }
});

// POST /integraciones/:id/ping
integraciones.post("/:id/ping", async (c) => {
  try {
    const supabase = getSupabase();
    const id = c.req.param("id");

    // Obtener la integración
    const { data: integracion, error: fetchError } = await supabase
      .from("integraciones")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;
    if (!integracion) return c.json({ error: "Integración no encontrada" }, 404);

    // Simular ping (en producción, aquí harías una llamada real a la API del proveedor)
    const pingSuccess = true; // TODO: implementar lógica real de ping

    // Actualizar ultimo_ping y estado
    const updateData: Record<string, unknown> = {
      ultimo_ping: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (pingSuccess) {
      updateData.estado = "activo";
      updateData.ultimo_error = null;
    } else {
      updateData.estado = "error";
      updateData.ultimo_error = "Error en ping";
    }

    const { data, error } = await supabase
      .from("integraciones")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Registrar log
    await supabase.from("integraciones_logs").insert({
      integracion_id: id,
      tipo: "conexion",
      nivel: pingSuccess ? "info" : "error",
      mensaje: pingSuccess ? "Ping exitoso" : "Ping fallido",
      metadata: { ping_success: pingSuccess },
    });

    return c.json({ data, success: pingSuccess });
  } catch (error) {
    console.log("Error en ping:", JSON.stringify(error));
    return c.json({ error: `Error en ping: ${errMsg(error)}` }, 500);
  }
});

// ── API Keys ────────────────────────────────────────────────────────────────

// GET /integraciones/api-keys
integraciones.get("/api-keys", async (c) => {
  try {
    const supabase = getSupabase();
    const { estado } = c.req.query();

    let query = supabase
      .from("api_keys")
      .select("*")
      .order("created_at", { ascending: false });

    if (estado) query = query.eq("estado", estado);

    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error listando API keys:", JSON.stringify(error));
    return c.json({ error: `Error listando API keys: ${errMsg(error)}` }, 500);
  }
});

// POST /integraciones/api-keys
integraciones.post("/api-keys", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    if (!body.nombre) {
      return c.json({ error: "nombre es requerido" }, 400);
    }

    // Generar key
    const rawKey = `ck_live_${crypto.randomUUID().replace(/-/g, "")}`;
    const keyPrefix = rawKey.substring(0, 16);
    const keyHash = await hashKey(rawKey);

    // Insertar en DB (sin la key real, solo el hash)
    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        nombre: body.nombre,
        descripcion: body.descripcion || null,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        permisos: body.permisos || [],
        estado: "activo",
        expira_en: body.expira_en || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Retornar la key real SOLO UNA VEZ
    return c.json({ data: { ...data, key: rawKey } }, 201);
  } catch (error) {
    console.log("Error creando API key:", JSON.stringify(error));
    return c.json({ error: `Error creando API key: ${errMsg(error)}` }, 500);
  }
});

// DELETE /integraciones/api-keys/:id
integraciones.delete("/api-keys/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("api_keys")
      .update({ estado: "revocado", updated_at: new Date().toISOString() })
      .eq("id", c.req.param("id"));

    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.log("Error revocando API key:", JSON.stringify(error));
    return c.json({ error: `Error revocando API key: ${errMsg(error)}` }, 500);
  }
});

// ── Webhooks ────────────────────────────────────────────────────────────────

// GET /integraciones/webhooks
integraciones.get("/webhooks", async (c) => {
  try {
    const supabase = getSupabase();
    const { estado } = c.req.query();

    let query = supabase
      .from("webhooks")
      .select("*")
      .order("created_at", { ascending: false });

    if (estado) query = query.eq("estado", estado);

    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error listando webhooks:", JSON.stringify(error));
    return c.json({ error: `Error listando webhooks: ${errMsg(error)}` }, 500);
  }
});

// POST /integraciones/webhooks
integraciones.post("/webhooks", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    if (!body.nombre || !body.url) {
      return c.json({ error: "nombre y url son requeridos" }, 400);
    }

    const { data, error } = await supabase
      .from("webhooks")
      .insert({
        nombre: body.nombre,
        url: body.url,
        eventos: body.eventos || [],
        estado: body.estado || "activo",
        secret: body.secret || null,
      })
      .select()
      .single();

    if (error) throw error;
    return c.json({ data }, 201);
  } catch (error) {
    console.log("Error creando webhook:", JSON.stringify(error));
    return c.json({ error: `Error creando webhook: ${errMsg(error)}` }, 500);
  }
});

// PUT /integraciones/webhooks/:id
integraciones.put("/webhooks/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("webhooks")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", c.req.param("id"))
      .select()
      .single();

    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error actualizando webhook:", JSON.stringify(error));
    return c.json({ error: `Error actualizando webhook: ${errMsg(error)}` }, 500);
  }
});

// DELETE /integraciones/webhooks/:id
integraciones.delete("/webhooks/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("webhooks")
      .delete()
      .eq("id", c.req.param("id"));

    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.log("Error eliminando webhook:", JSON.stringify(error));
    return c.json({ error: `Error eliminando webhook: ${errMsg(error)}` }, 500);
  }
});

export { integraciones };
