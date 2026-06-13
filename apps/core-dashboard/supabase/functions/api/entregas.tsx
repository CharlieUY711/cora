import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { getSupabase, getTenant, errMsg, corsHeaders } from "./_shared.ts";

const entregas = new Hono();
entregas.use("/*", cors(corsHeaders));
entregas.options("/*", (c) => c.text("", 204));

entregas.get("/", async (c) => {
  try {
    const supabase = getSupabase();
    const { estado, desde, hasta } = c.req.query();
    let query = supabase
      .from("entregas")
      .select("*, envios(id, numero, destinatario, destino)")
      .eq("tenant_id", getTenant(c))
      .order("created_at", { ascending: false });
    if (estado) query = query.eq("estado", estado);
    if (desde)  query = query.gte("fecha_entrega", desde);
    if (hasta)  query = query.lte("fecha_entrega", hasta);
    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data: data ?? [] });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

entregas.get("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("entregas").select("*, envios(*)")
      .eq("id", c.req.param("id")).single();
    if (error) throw error;
    return c.json({ data });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

entregas.post("/", async (c) => {
  try {
    const supabase = getSupabase();
    const tenant = getTenant(c);
    const body = await c.req.json();
    if (!body.envio_id) return c.json({ error: "envio_id es requerido" }, 400);
    const { data, error } = await supabase
      .from("entregas")
      .insert({
        ...body, tenant_id: tenant,
        estado: body.estado ?? "entregado",
        fecha_entrega: body.fecha_entrega ?? new Date().toISOString(),
      })
      .select().single();
    if (error) throw error;
    await Promise.all([
      supabase.from("envios").update({ estado: body.estado ?? "entregado" }).eq("id", body.envio_id),
      supabase.from("tracking_eventos").insert({
        tenant_id: tenant, envio_id: body.envio_id,
        estado: body.estado ?? "entregado",
        descripcion: body.notas ?? "Entrega confirmada",
        lat: body.lat, lng: body.lng, usuario_id: body.usuario_id,
      }),
      body.route_stop_id
        ? supabase.from("route_stops")
            .update({ status: "completed", completed_at: new Date().toISOString(), proof_url: body.foto_url })
            .eq("id", body.route_stop_id)
        : Promise.resolve(),
    ]);
    return c.json({ data }, 201);
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

export { entregas };
