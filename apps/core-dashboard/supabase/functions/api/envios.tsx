import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { getSupabase, getTenant, errMsg, corsHeaders } from "./_shared.ts";

const envios = new Hono();
envios.use("/*", cors(corsHeaders));
envios.options("/*", (c) => c.text("", 204));

// GET /envios
envios.get("/", async (c) => {
  try {
    const supabase = getSupabase();
    const tenant = getTenant(c);
    const { estado, courier_id, transportista_id, route_id, desde, hasta, page, limit } = c.req.query();
    const pageNum = parseInt(page ?? "1");
    const limitNum = parseInt(limit ?? "50");
    const from = (pageNum - 1) * limitNum;

    let query = supabase
      .from("envios")
      .select("*, routes(id, name, date, status), transportistas(id, nombre), couriers(id, name)", { count: "exact" })
      .eq("tenant_id", tenant)
      .order("created_at", { ascending: false })
      .range(from, from + limitNum - 1);

    if (estado)           query = query.eq("estado", estado);
    if (courier_id)       query = query.eq("courier_id", courier_id);
    if (transportista_id) query = query.eq("transportista_id", transportista_id);
    if (route_id)         query = query.eq("route_id", route_id);
    if (desde)            query = query.gte("created_at", desde);
    if (hasta)            query = query.lte("created_at", hasta);

    const { data, error, count } = await query;
    if (error) throw error;
    return c.json({ data: data ?? [], count: count ?? 0, page: pageNum, limit: limitNum });
  } catch (e) {
    console.error("[envios] GET /", e);
    return c.json({ error: errMsg(e) }, 500);
  }
});

// GET /envios/tracking/:numero — publico
envios.get("/tracking/:numero", async (c) => {
  try {
    const supabase = getSupabase();
    const numero = c.req.param("numero");
    const { data: envio, error } = await supabase
      .from("envios")
      .select("id, numero, tracking, estado, origen, destino, destinatario, fecha_estimada, fecha_entrega")
      .or(`numero.eq.${numero},tracking.eq.${numero}`)
      .single();
    if (error || !envio) return c.json({ error: "Envio no encontrado" }, 404);
    const { data: eventos } = await supabase
      .from("tracking_eventos")
      .select("estado, descripcion, ubicacion, lat, lng, created_at")
      .eq("envio_id", envio.id)
      .order("created_at", { ascending: false });
    return c.json({ data: envio, eventos: eventos ?? [] });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

// GET /envios/:id
envios.get("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const tenant = getTenant(c);
    const id = c.req.param("id");
    const { data: envio, error } = await supabase
      .from("envios")
      .select("*, routes(id, name, date), transportistas(id, nombre, telefono), couriers(id, name)")
      .eq("id", id)
      .eq("tenant_id", tenant)
      .single();
    if (error) throw error;
    if (!envio) return c.json({ error: "Envio no encontrado" }, 404);
    const { data: tracking } = await supabase
      .from("tracking_eventos")
      .select("*")
      .eq("envio_id", id)
      .order("created_at", { ascending: false });
    const { data: entrega } = await supabase
      .from("entregas")
      .select("*")
      .eq("envio_id", id)
      .maybeSingle();
    return c.json({ data: envio, tracking: tracking ?? [], entrega });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

// POST /envios
envios.post("/", async (c) => {
  try {
    const supabase = getSupabase();
    const tenant = getTenant(c);
    const body = await c.req.json();
    if (!body.origen || !body.destino || !body.destinatario) {
      return c.json({ error: "origen, destino y destinatario son requeridos" }, 400);
    }
    const { count } = await supabase
      .from("envios")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant);
    const numero = `ENV-${String((count ?? 0) + 1).padStart(6, "0")}`;
    const { data, error } = await supabase
      .from("envios")
      .insert({ ...body, tenant_id: tenant, numero, estado: body.estado ?? "pendiente" })
      .select()
      .single();
    if (error) throw error;
    await supabase.from("tracking_eventos").insert({
      tenant_id: tenant, envio_id: data.id,
      estado: "pendiente", descripcion: "Envio creado en el sistema",
    });
    return c.json({ data }, 201);
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

// POST /envios/bulk
envios.post("/bulk", async (c) => {
  try {
    const supabase = getSupabase();
    const tenant = getTenant(c);
    const { items } = await c.req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return c.json({ error: "items debe ser un array no vacio" }, 400);
    }
    const { count: baseCount } = await supabase
      .from("envios").select("id", { count: "exact", head: true }).eq("tenant_id", tenant);
    const errores: { fila: number; error: string }[] = [];
    const creados: any[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.origen || !item.destino || !item.destinatario) {
        errores.push({ fila: i + 1, error: "origen, destino y destinatario son requeridos" });
        continue;
      }
      const numero = `ENV-${String((baseCount ?? 0) + creados.length + 1).padStart(6, "0")}`;
      const { data, error } = await supabase
        .from("envios")
        .insert({ ...item, tenant_id: tenant, numero, estado: "pendiente" })
        .select().single();
      if (error) errores.push({ fila: i + 1, error: errMsg(error) });
      else creados.push(data);
    }
    return c.json({ creados: creados.length, errores, data: creados }, errores.length === items.length ? 400 : 201);
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

// PUT /envios/:id
envios.put("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const tenant = getTenant(c);
    const id = c.req.param("id");
    const body = await c.req.json();
    if (body.estado) {
      const { data: actual } = await supabase
        .from("envios").select("estado").eq("id", id).single();
      if (actual && actual.estado !== body.estado) {
        await supabase.from("tracking_eventos").insert({
          tenant_id: tenant, envio_id: id, estado: body.estado,
          descripcion: body.descripcion_evento ?? `Estado actualizado a ${body.estado}`,
          ubicacion: body.ubicacion ?? "Sistema",
          usuario_id: body.usuario_id,
        });
      }
    }
    const { data, error } = await supabase
      .from("envios")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id).eq("tenant_id", tenant)
      .select().single();
    if (error) throw error;
    return c.json({ data });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

// DELETE /envios/:id
envios.delete("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("envios").delete()
      .eq("id", c.req.param("id")).eq("tenant_id", getTenant(c));
    if (error) throw error;
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

export { envios };
