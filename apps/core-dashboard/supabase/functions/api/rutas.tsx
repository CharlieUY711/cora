import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { getSupabase, getTenant, errMsg, corsHeaders } from "./_shared.ts";

const rutas = new Hono();
rutas.use("/*", cors(corsHeaders));
rutas.options("/*", (c) => c.text("", 204));

rutas.get("/", async (c) => {
  try {
    const supabase = getSupabase();
    const tenant = getTenant(c);
    const { fecha, status, transportista_id } = c.req.query();
    let query = supabase
      .from("routes")
      .select("*, route_stops(*, envios(id, numero, destinatario, destino, estado)), transportistas(id, nombre), vehiculos(id, patente, tipo)")
      .eq("tenant_id", tenant)
      .order("date", { ascending: false });
    if (fecha)            query = query.eq("date", fecha);
    if (status)           query = query.eq("status", status);
    if (transportista_id) query = query.eq("transportista_id", transportista_id);
    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data: data ?? [] });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

rutas.get("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("routes")
      .select("*, route_stops(*, envios(*)), transportistas(*), vehiculos(*)")
      .eq("id", c.req.param("id"))
      .eq("tenant_id", getTenant(c))
      .single();
    if (error) throw error;
    if (!data) return c.json({ error: "Ruta no encontrada" }, 404);
    return c.json({ data });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

rutas.post("/", async (c) => {
  try {
    const supabase = getSupabase();
    const tenant = getTenant(c);
    const body = await c.req.json();
    if (!body.name || !body.date) return c.json({ error: "name y date son requeridos" }, 400);
    const { data, error } = await supabase
      .from("routes")
      .insert({ ...body, tenant_id: tenant, status: body.status ?? "pendiente" })
      .select().single();
    if (error) throw error;
    return c.json({ data }, 201);
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

rutas.put("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();
    const { data, error } = await supabase
      .from("routes")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", c.req.param("id")).eq("tenant_id", getTenant(c))
      .select().single();
    if (error) throw error;
    return c.json({ data });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

rutas.delete("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("routes").delete()
      .eq("id", c.req.param("id")).eq("tenant_id", getTenant(c));
    if (error) throw error;
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

rutas.post("/:id/paradas", async (c) => {
  try {
    const supabase = getSupabase();
    const tenant = getTenant(c);
    const route_id = c.req.param("id");
    const body = await c.req.json();
    if (!body.envio_id) return c.json({ error: "envio_id es requerido" }, 400);
    const { count } = await supabase
      .from("route_stops").select("id", { count: "exact", head: true }).eq("route_id", route_id);
    const { data, error } = await supabase
      .from("route_stops")
      .insert({
        tenant_id: tenant, route_id, envio_id: body.envio_id,
        address: body.address, recipient_name: body.recipient_name,
        lat: body.lat, lng: body.lng,
        order_index: body.order_index ?? (count ?? 0),
        status: "pendiente", notes: body.notes,
      })
      .select().single();
    if (error) throw error;
    await supabase.from("envios").update({ route_id }).eq("id", body.envio_id);
    return c.json({ data }, 201);
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

rutas.put("/:id/paradas/reordenar", async (c) => {
  try {
    const supabase = getSupabase();
    const { orden } = await c.req.json();
    if (!Array.isArray(orden)) return c.json({ error: "orden debe ser un array" }, 400);
    for (const stop of orden) {
      await supabase.from("route_stops")
        .update({ order_index: stop.order_index }).eq("id", stop.id);
    }
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

rutas.post("/:id/optimizar", async (c) => {
  try {
    const supabase = getSupabase();
    const route_id = c.req.param("id");
    const { data: paradas, error } = await supabase
      .from("route_stops").select("id, lat, lng, address")
      .eq("route_id", route_id).not("lat", "is", null);
    if (error) throw error;
    if (!paradas || paradas.length === 0) return c.json({ error: "No hay paradas con coordenadas" }, 400);
    const optimizado = greedyTSP(paradas);
    for (let i = 0; i < optimizado.length; i++) {
      await supabase.from("route_stops")
        .update({ order_index: i }).eq("id", optimizado[i].id);
    }
    return c.json({ data: optimizado });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

function greedyTSP(paradas: any[]) {
  const dist = (a: any, b: any) =>
    Math.sqrt(Math.pow(a.lat - b.lat, 2) + Math.pow(a.lng - b.lng, 2));
  const restantes = [...paradas];
  const ruta = [restantes.splice(0, 1)[0]];
  while (restantes.length > 0) {
    const actual = ruta[ruta.length - 1];
    let minDist = Infinity, minIdx = 0;
    restantes.forEach((p, i) => { const d = dist(actual, p); if (d < minDist) { minDist = d; minIdx = i; } });
    ruta.push(restantes.splice(minIdx, 1)[0]);
  }
  return ruta;
}

export { rutas };
