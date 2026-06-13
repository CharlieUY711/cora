import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { getSupabase, getTenant, errMsg, corsHeaders } from "./_shared.ts";

const depositos = new Hono();
depositos.use("/*", cors(corsHeaders));
depositos.options("/*", (c) => c.text("", 204));

depositos.get("/", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("depositos")
      .select("*, inventario(id, sku, nombre, cantidad)")
      .eq("tenant_id", getTenant(c)).order("nombre");
    if (error) throw error;
    return c.json({ data: data ?? [] });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

depositos.get("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("depositos").select("*, inventario(*)")
      .eq("id", c.req.param("id")).eq("tenant_id", getTenant(c)).single();
    if (error) throw error;
    return c.json({ data });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

depositos.post("/", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();
    if (!body.nombre || !body.direccion) return c.json({ error: "nombre y direccion son requeridos" }, 400);
    const { data, error } = await supabase
      .from("depositos")
      .insert({ ...body, tenant_id: getTenant(c), activo: body.activo ?? true })
      .select().single();
    if (error) throw error;
    return c.json({ data }, 201);
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

depositos.put("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();
    const { data, error } = await supabase
      .from("depositos")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", c.req.param("id")).eq("tenant_id", getTenant(c))
      .select().single();
    if (error) throw error;
    return c.json({ data });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

depositos.delete("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("depositos").delete()
      .eq("id", c.req.param("id")).eq("tenant_id", getTenant(c));
    if (error) throw error;
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

export { depositos };
