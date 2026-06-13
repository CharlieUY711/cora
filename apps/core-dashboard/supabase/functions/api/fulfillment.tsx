import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";

const fulfillment = new Hono();

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

// GET /fulfillment/ordenes
fulfillment.get("/ordenes", async (c) => {
  try {
    const supabase = getSupabase();
    const { estado, search } = c.req.query();

    let query = supabase
      .from("fulfillment_ordenes")
      .select("*")
      .order("created_at", { ascending: false });

    if (estado) query = query.eq("estado", estado);
    if (search) {
      query = query.or(`numero.ilike.%${search}%,cliente.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error listando órdenes fulfillment:", JSON.stringify(error));
    return c.json({ error: `Error listando órdenes: ${errMsg(error)}` }, 500);
  }
});

// GET /fulfillment/ordenes/:id
fulfillment.get("/ordenes/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("fulfillment_ordenes")
      .select("*")
      .eq("id", c.req.param("id"))
      .single();

    if (error) throw error;
    if (!data) return c.json({ error: "Orden no encontrada" }, 404);
    return c.json({ data });
  } catch (error) {
    console.log("Error obteniendo orden:", JSON.stringify(error));
    return c.json({ error: `Error obteniendo orden: ${errMsg(error)}` }, 500);
  }
});

// POST /fulfillment/ordenes
fulfillment.post("/ordenes", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    if (!body.cliente) {
      return c.json({ error: "cliente es requerido" }, 400);
    }

    const { data, error } = await supabase
      .from("fulfillment_ordenes")
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return c.json({ data }, 201);
  } catch (error) {
    console.log("Error creando orden:", JSON.stringify(error));
    return c.json({ error: `Error creando orden: ${errMsg(error)}` }, 500);
  }
});

// PUT /fulfillment/ordenes/:id
fulfillment.put("/ordenes/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("fulfillment_ordenes")
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

// DELETE /fulfillment/ordenes/:id
fulfillment.delete("/ordenes/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("fulfillment_ordenes")
      .delete()
      .eq("id", c.req.param("id"));

    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.log("Error eliminando orden:", JSON.stringify(error));
    return c.json({ error: `Error eliminando orden: ${errMsg(error)}` }, 500);
  }
});

// GET /fulfillment/waves
fulfillment.get("/waves", async (c) => {
  try {
    const supabase = getSupabase();
    const { estado } = c.req.query();

    let query = supabase
      .from("fulfillment_waves")
      .select("*")
      .order("created_at", { ascending: false });

    if (estado) query = query.eq("estado", estado);

    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error listando waves:", JSON.stringify(error));
    return c.json({ error: `Error listando waves: ${errMsg(error)}` }, 500);
  }
});

// POST /fulfillment/waves
fulfillment.post("/waves", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    if (!body.nombre) {
      return c.json({ error: "nombre es requerido" }, 400);
    }

    const { data, error } = await supabase
      .from("fulfillment_waves")
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return c.json({ data }, 201);
  } catch (error) {
    console.log("Error creando wave:", JSON.stringify(error));
    return c.json({ error: `Error creando wave: ${errMsg(error)}` }, 500);
  }
});

// PUT /fulfillment/waves/:id
fulfillment.put("/waves/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("fulfillment_waves")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", c.req.param("id"))
      .select()
      .single();

    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error actualizando wave:", JSON.stringify(error));
    return c.json({ error: `Error actualizando wave: ${errMsg(error)}` }, 500);
  }
});

// DELETE /fulfillment/waves/:id
fulfillment.delete("/waves/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("fulfillment_waves")
      .delete()
      .eq("id", c.req.param("id"));

    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.log("Error eliminando wave:", JSON.stringify(error));
    return c.json({ error: `Error eliminando wave: ${errMsg(error)}` }, 500);
  }
});

export { fulfillment };
