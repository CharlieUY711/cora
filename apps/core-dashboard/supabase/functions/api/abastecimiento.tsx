import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";

const abastecimiento = new Hono();

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

// GET /abastecimiento/alertas
abastecimiento.get("/alertas", async (c) => {
  try {
    const supabase = getSupabase();
    const { activa, nivel, search } = c.req.query();

    let query = supabase
      .from("abastecimiento_alertas")
      .select("*")
      .order("created_at", { ascending: false });

    if (activa !== undefined) query = query.eq("activa", activa === "true");
    if (nivel) query = query.eq("nivel", nivel);
    if (search) query = query.or(`producto.ilike.%${search}%,sku.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error listando alertas:", JSON.stringify(error));
    return c.json({ error: `Error listando alertas: ${errMsg(error)}` }, 500);
  }
});

// POST /abastecimiento/alertas
abastecimiento.post("/alertas", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    if (!body.producto || !body.tipo || !body.nivel) {
      return c.json({ error: "producto, tipo y nivel son requeridos" }, 400);
    }

    const { data, error } = await supabase
      .from("abastecimiento_alertas")
      .insert({ ...body, activa: body.activa ?? true })
      .select()
      .single();

    if (error) throw error;
    return c.json({ data }, 201);
  } catch (error) {
    console.log("Error creando alerta:", JSON.stringify(error));
    return c.json({ error: `Error creando alerta: ${errMsg(error)}` }, 500);
  }
});

// PUT /abastecimiento/alertas/:id
abastecimiento.put("/alertas/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("abastecimiento_alertas")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", c.req.param("id"))
      .select()
      .single();

    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error actualizando alerta:", JSON.stringify(error));
    return c.json({ error: `Error actualizando alerta: ${errMsg(error)}` }, 500);
  }
});

// DELETE /abastecimiento/alertas/:id
abastecimiento.delete("/alertas/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("abastecimiento_alertas")
      .delete()
      .eq("id", c.req.param("id"));

    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.log("Error eliminando alerta:", JSON.stringify(error));
    return c.json({ error: `Error eliminando alerta: ${errMsg(error)}` }, 500);
  }
});

// GET /abastecimiento/ordenes-compra
abastecimiento.get("/ordenes-compra", async (c) => {
  try {
    const supabase = getSupabase();
    const { estado, search } = c.req.query();

    let query = supabase
      .from("abastecimiento_ordenes_compra")
      .select("*")
      .order("created_at", { ascending: false });

    if (estado) query = query.eq("estado", estado);
    if (search) query = query.or(`producto.ilike.%${search}%,proveedor.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error listando órdenes de compra:", JSON.stringify(error));
    return c.json({ error: `Error listando órdenes: ${errMsg(error)}` }, 500);
  }
});

// POST /abastecimiento/ordenes-compra
abastecimiento.post("/ordenes-compra", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    if (!body.proveedor || !body.producto) {
      return c.json({ error: "proveedor y producto son requeridos" }, 400);
    }

    const { data, error } = await supabase
      .from("abastecimiento_ordenes_compra")
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return c.json({ data }, 201);
  } catch (error) {
    console.log("Error creando orden de compra:", JSON.stringify(error));
    return c.json({ error: `Error creando orden: ${errMsg(error)}` }, 500);
  }
});

// PUT /abastecimiento/ordenes-compra/:id
abastecimiento.put("/ordenes-compra/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("abastecimiento_ordenes_compra")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", c.req.param("id"))
      .select()
      .single();

    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error actualizando orden:", JSON.stringify(error));
    return c.json({ error: `Error actualizando orden: ${errMsg(error)}` }, 500);
  }
});

// DELETE /abastecimiento/ordenes-compra/:id
abastecimiento.delete("/ordenes-compra/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("abastecimiento_ordenes_compra")
      .delete()
      .eq("id", c.req.param("id"));

    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.log("Error eliminando orden:", JSON.stringify(error));
    return c.json({ error: `Error eliminando orden: ${errMsg(error)}` }, 500);
  }
});

// GET /abastecimiento/mrp
abastecimiento.get("/mrp", async (c) => {
  try {
    const supabase = getSupabase();
    const { search } = c.req.query();

    let query = supabase
      .from("abastecimiento_mrp")
      .select("*")
      .order("created_at", { ascending: false });

    if (search) query = query.or(`componente.ilike.%${search}%,sku.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error listando MRP:", JSON.stringify(error));
    return c.json({ error: `Error listando MRP: ${errMsg(error)}` }, 500);
  }
});

// POST /abastecimiento/mrp
abastecimiento.post("/mrp", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    if (!body.componente) {
      return c.json({ error: "componente es requerido" }, 400);
    }

    const { data, error } = await supabase
      .from("abastecimiento_mrp")
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return c.json({ data }, 201);
  } catch (error) {
    console.log("Error creando componente MRP:", JSON.stringify(error));
    return c.json({ error: `Error creando componente: ${errMsg(error)}` }, 500);
  }
});

// PUT /abastecimiento/mrp/:id
abastecimiento.put("/mrp/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("abastecimiento_mrp")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", c.req.param("id"))
      .select()
      .single();

    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error actualizando componente MRP:", JSON.stringify(error));
    return c.json({ error: `Error actualizando componente: ${errMsg(error)}` }, 500);
  }
});

// DELETE /abastecimiento/mrp/:id
abastecimiento.delete("/mrp/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("abastecimiento_mrp")
      .delete()
      .eq("id", c.req.param("id"));

    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.log("Error eliminando componente MRP:", JSON.stringify(error));
    return c.json({ error: `Error eliminando componente: ${errMsg(error)}` }, 500);
  }
});

export { abastecimiento };
