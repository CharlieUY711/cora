import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { getSupabase, getTenant, errMsg, corsHeaders } from "./_shared.ts";

const vehiculos = new Hono();
vehiculos.use("/*", cors(corsHeaders));
vehiculos.options("/*", (c) => c.text("", 204));

vehiculos.get("/", async (c) => {
  try {
    const supabase = getSupabase();
    const { transportista_id, activo } = c.req.query();
    let query = supabase
      .from("vehiculos")
      .select("*, transportistas(id, nombre)")
      .eq("tenant_id", getTenant(c))
      .order("created_at", { ascending: false });
    if (transportista_id) query = query.eq("transportista_id", transportista_id);
    if (activo !== undefined) query = query.eq("activo", activo === "true");
    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data: data ?? [] });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

vehiculos.get("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("vehiculos").select("*, transportistas(id, nombre)")
      .eq("id", c.req.param("id")).eq("tenant_id", getTenant(c)).single();
    if (error) throw error;
    return c.json({ data });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

vehiculos.post("/", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();
    if (!body.patente || !body.tipo) return c.json({ error: "patente y tipo son requeridos" }, 400);
    const { data, error } = await supabase
      .from("vehiculos")
      .insert({ ...body, tenant_id: getTenant(c), activo: body.activo ?? true })
      .select().single();
    if (error) throw error;
    return c.json({ data }, 201);
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

vehiculos.put("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();
    const { data, error } = await supabase
      .from("vehiculos")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", c.req.param("id")).eq("tenant_id", getTenant(c))
      .select().single();
    if (error) throw error;
    return c.json({ data });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

vehiculos.delete("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("vehiculos").delete()
      .eq("id", c.req.param("id")).eq("tenant_id", getTenant(c));
    if (error) throw error;
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

export { vehiculos };
