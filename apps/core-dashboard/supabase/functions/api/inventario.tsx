import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { getSupabase, getTenant, errMsg, corsHeaders } from "./_shared.ts";

const inventario = new Hono();
inventario.use("/*", cors(corsHeaders));
inventario.options("/*", (c) => c.text("", 204));

inventario.get("/", async (c) => {
  try {
    const supabase = getSupabase();
    const tenant = getTenant(c);
    const { deposito_id, categoria, search } = c.req.query();
    let query = supabase
      .from("inventario")
      .select("*, depositos(id, nombre, ciudad)")
      .eq("tenant_id", tenant).order("nombre");
    if (deposito_id) query = query.eq("deposito_id", deposito_id);
    if (categoria)   query = query.eq("categoria", categoria);
    if (search)      query = query.ilike("nombre", `%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    const result = data ?? [];
    const alertas = result.filter((i: any) => i.cantidad <= i.cantidad_minima);
    return c.json({ data: result, alertas_count: alertas.length });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

inventario.get("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const id = c.req.param("id");
    const { data: item, error } = await supabase
      .from("inventario").select("*, depositos(id, nombre)")
      .eq("id", id).eq("tenant_id", getTenant(c)).single();
    if (error) throw error;
    const { data: movimientos } = await supabase
      .from("inventario_movimientos").select("*")
      .eq("inventario_id", id)
      .order("created_at", { ascending: false }).limit(20);
    return c.json({ data: item, movimientos: movimientos ?? [] });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

inventario.post("/", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();
    if (!body.sku || !body.nombre || !body.deposito_id) {
      return c.json({ error: "sku, nombre y deposito_id son requeridos" }, 400);
    }
    const { data, error } = await supabase
      .from("inventario")
      .insert({ ...body, tenant_id: getTenant(c), cantidad: body.cantidad ?? 0 })
      .select().single();
    if (error) throw error;
    return c.json({ data }, 201);
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

inventario.put("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();
    const { data, error } = await supabase
      .from("inventario")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", c.req.param("id")).eq("tenant_id", getTenant(c))
      .select().single();
    if (error) throw error;
    return c.json({ data });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

inventario.post("/:id/movimiento", async (c) => {
  try {
    const supabase = getSupabase();
    const tenant = getTenant(c);
    const id = c.req.param("id");
    const { tipo, cantidad, referencia, notas, usuario_id } = await c.req.json();
    if (!tipo || !cantidad) return c.json({ error: "tipo y cantidad son requeridos" }, 400);
    if (!["entrada","salida","ajuste","transferencia"].includes(tipo)) {
      return c.json({ error: "tipo invalido" }, 400);
    }
    const { data: item, error: fetchErr } = await supabase
      .from("inventario").select("cantidad").eq("id", id).single();
    if (fetchErr) throw fetchErr;
    const delta = tipo === "salida" ? -Math.abs(cantidad) : Math.abs(cantidad);
    const nueva_cantidad = tipo === "ajuste" ? cantidad : item.cantidad + delta;
    if (nueva_cantidad < 0) return c.json({ error: "Stock insuficiente" }, 400);
    const [{ error: movErr }, { error: updErr }] = await Promise.all([
      supabase.from("inventario_movimientos").insert({
        tenant_id: tenant, inventario_id: id, tipo, cantidad, referencia, notas, usuario_id,
      }),
      supabase.from("inventario").update({ cantidad: nueva_cantidad, updated_at: new Date().toISOString() }).eq("id", id),
    ]);
    if (movErr) throw movErr;
    if (updErr) throw updErr;
    return c.json({ success: true, cantidad_anterior: item.cantidad, cantidad_nueva: nueva_cantidad });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

inventario.delete("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("inventario").delete()
      .eq("id", c.req.param("id")).eq("tenant_id", getTenant(c));
    if (error) throw error;
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: errMsg(e) }, 500);
  }
});

export { inventario };
