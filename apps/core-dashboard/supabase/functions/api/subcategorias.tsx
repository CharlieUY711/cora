import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";

const subcategorias = new Hono();

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

// GET /subcategorias
subcategorias.get("/", async (c) => {
  try {
    const supabase = getSupabase();
    const { categoria_id, activo } = c.req.query();
    let query = supabase
      .from("subcategorias")
      .select("*")
      .order("orden", { ascending: true });
    if (categoria_id) query = query.eq("categoria_id", categoria_id);
    if (activo !== undefined) query = query.eq("activo", activo === "true");
    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error listando subcategorías:", JSON.stringify(error));
    return c.json({ error: `Error listando subcategorías: ${errMsg(error)}` }, 500);
  }
});

// GET /subcategorias/:id
subcategorias.get("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("subcategorias")
      .select("*")
      .eq("id", c.req.param("id"))
      .single();

    if (error) throw error;
    if (!data) return c.json({ error: "Subcategoría no encontrada" }, 404);
    return c.json({ data });
  } catch (error) {
    console.log("Error obteniendo subcategoría:", JSON.stringify(error));
    return c.json({ error: `Error obteniendo subcategoría: ${errMsg(error)}` }, 500);
  }
});

// POST /subcategorias
subcategorias.post("/", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    if (!body.nombre) {
      return c.json({ error: "nombre es requerido" }, 400);
    }
    if (!body.categoria_id) {
      return c.json({ error: "categoria_id es requerido" }, 400);
    }

    const { data, error } = await supabase
      .from("subcategorias")
      .insert({ ...body, activo: body.activo ?? true })
      .select()
      .single();

    if (error) throw error;
    return c.json({ data }, 201);
  } catch (error) {
    console.log("Error creando subcategoría:", JSON.stringify(error));
    return c.json({ error: `Error creando subcategoría: ${errMsg(error)}` }, 500);
  }
});

// PUT /subcategorias/:id
subcategorias.put("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("subcategorias")
      .update(body)
      .eq("id", c.req.param("id"))
      .select()
      .single();

    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error actualizando subcategoría:", JSON.stringify(error));
    return c.json({ error: `Error actualizando subcategoría: ${errMsg(error)}` }, 500);
  }
});

// DELETE /subcategorias/:id
subcategorias.delete("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("subcategorias")
      .delete()
      .eq("id", c.req.param("id"));

    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.log("Error eliminando subcategoría:", JSON.stringify(error));
    return c.json({ error: `Error eliminando subcategoría: ${errMsg(error)}` }, 500);
  }
});

export { subcategorias };
