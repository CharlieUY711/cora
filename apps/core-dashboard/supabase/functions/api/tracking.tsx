import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { getSupabase, getTenant, errMsg, corsHeaders } from "./_shared.ts";

const tracking = new Hono();
tracking.use("/*", cors(corsHeaders));
tracking.options("/*", (c) => c.text("", 204));

tracking.get("/:numero", async (c) => {
  try {
    const supabase = getSupabase();
    const numero = c.req.param("numero");
    const { data: envio, error } = await supabase
      .from("envios")
      .select("id, numero, tracking, estado, origen, destino, destinatario, fecha_estimada, fecha_entrega, carrier, peso, bultos")
      .or(`numero.eq.${numero},tracking.eq.${numero}`)
      .single();
    if (error || !envio) return c.json({ error: "Envio no encontrado" }, 404);
    const { data: eventos } = await supabase
      .from("tracking_eventos").select("estado, descripcion, ubicacion, lat, lng, created_at")
      .eq("envio_id", envio.id).order("created_at", { ascending: false });
    const { data: entrega } = await supabase
      .from("entregas").select("estado, fecha_entrega, firmado_por, foto_url")
      .eq("envio_id", envio.id).maybeSingle();
    return c.json({ data: envio, eventos: eventos ?? [], entrega });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

tracking.post("/:envio_id/evento", async (c) => {
  try {
    const supabase = getSupabase();
    const tenant = getTenant(c);
    const envio_id = c.req.param("envio_id");
    const body = await c.req.json();
    if (!body.estado || !body.descripcion) {
      return c.json({ error: "estado y descripcion son requeridos" }, 400);
    }
    const { data, error } = await supabase
      .from("tracking_eventos")
      .insert({
        tenant_id: tenant, envio_id, estado: body.estado,
        descripcion: body.descripcion, ubicacion: body.ubicacion,
        lat: body.lat, lng: body.lng, usuario_id: body.usuario_id,
      })
      .select().single();
    if (error) throw error;
    await supabase.from("envios").update({ estado: body.estado }).eq("id", envio_id);
    return c.json({ data }, 201);
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

tracking.get("/envio/:envio_id/historial", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("tracking_eventos").select("*")
      .eq("envio_id", c.req.param("envio_id"))
      .order("created_at", { ascending: false });
    if (error) throw error;
    return c.json({ data: data ?? [] });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

export { tracking };
