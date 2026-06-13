import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";

const produccion = new Hono();

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

// GET /produccion/articulos
produccion.get("/articulos", async (c) => {
  try {
    const supabase = getSupabase();
    const { activo, search } = c.req.query();

    let query = supabase
      .from("produccion_articulos")
      .select("*")
      .order("created_at", { ascending: false });

    if (activo !== undefined) query = query.eq("activo", activo === "true");
    if (search) query = query.or(`nombre.ilike.%${search}%,sku.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error listando artículos:", JSON.stringify(error));
    return c.json({ error: `Error listando artículos: ${errMsg(error)}` }, 500);
  }
});

// GET /produccion/articulos/:id
produccion.get("/articulos/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("produccion_articulos")
      .select("*")
      .eq("id", c.req.param("id"))
      .single();

    if (error) throw error;
    if (!data) return c.json({ error: "Artículo no encontrado" }, 404);
    return c.json({ data });
  } catch (error) {
    console.log("Error obteniendo artículo:", JSON.stringify(error));
    return c.json({ error: `Error obteniendo artículo: ${errMsg(error)}` }, 500);
  }
});

// POST /produccion/articulos
produccion.post("/articulos", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    if (!body.nombre) {
      return c.json({ error: "nombre es requerido" }, 400);
    }

    const { data, error } = await supabase
      .from("produccion_articulos")
      .insert({ ...body, activo: body.activo ?? true })
      .select()
      .single();

    if (error) throw error;
    return c.json({ data }, 201);
  } catch (error) {
    console.log("Error creando artículo:", JSON.stringify(error));
    return c.json({ error: `Error creando artículo: ${errMsg(error)}` }, 500);
  }
});

// PUT /produccion/articulos/:id
produccion.put("/articulos/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("produccion_articulos")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", c.req.param("id"))
      .select()
      .single();

    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error actualizando artículo:", JSON.stringify(error));
    return c.json({ error: `Error actualizando artículo: ${errMsg(error)}` }, 500);
  }
});

// DELETE /produccion/articulos/:id
produccion.delete("/articulos/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("produccion_articulos")
      .delete()
      .eq("id", c.req.param("id"));

    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.log("Error eliminando artículo:", JSON.stringify(error));
    return c.json({ error: `Error eliminando artículo: ${errMsg(error)}` }, 500);
  }
});

// GET /produccion/ordenes
produccion.get("/ordenes", async (c) => {
  try {
    const supabase = getSupabase();
    const { estado, search } = c.req.query();

    let query = supabase
      .from("produccion_ordenes_armado")
      .select("*")
      .order("created_at", { ascending: false });

    if (estado) query = query.eq("estado", estado);
    if (search) query = query.or(`numero.ilike.%${search}%,articulo_nombre.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error listando órdenes de armado:", JSON.stringify(error));
    return c.json({ error: `Error listando órdenes: ${errMsg(error)}` }, 500);
  }
});

// GET /produccion/ordenes/:id
produccion.get("/ordenes/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("produccion_ordenes_armado")
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

// POST /produccion/ordenes
produccion.post("/ordenes", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    if (!body.articulo_id || !body.cantidad) {
      return c.json({ error: "articulo_id y cantidad son requeridos" }, 400);
    }

    const { data, error } = await supabase
      .from("produccion_ordenes_armado")
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

// PUT /produccion/ordenes/:id
produccion.put("/ordenes/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("produccion_ordenes_armado")
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

// DELETE /produccion/ordenes/:id
produccion.delete("/ordenes/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("produccion_ordenes_armado")
      .delete()
      .eq("id", c.req.param("id"));

    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.log("Error eliminando orden:", JSON.stringify(error));
    return c.json({ error: `Error eliminando orden: ${errMsg(error)}` }, 500);
  }
});

export { produccion };
