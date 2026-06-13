import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";

const transportistas = new Hono();

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

// GET /transportistas
transportistas.get("/", async (c) => {
  try {
    const supabase = getSupabase();
    const { activo, search } = c.req.query();

    let query = supabase
      .from("transportistas")
      .select("*")
      .order("created_at", { ascending: false });

    if (activo !== undefined) query = query.eq("activo", activo === "true");
    if (search) query = query.ilike("nombre", `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error listando transportistas:", JSON.stringify(error));
    return c.json({ error: `Error listando transportistas: ${errMsg(error)}` }, 500);
  }
});

// GET /transportistas/:id
transportistas.get("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("transportistas")
      .select("*")
      .eq("id", c.req.param("id"))
      .single();

    if (error) throw error;
    if (!data) return c.json({ error: "Transportista no encontrado" }, 404);
    return c.json({ data });
  } catch (error) {
    console.log("Error obteniendo transportista:", JSON.stringify(error));
    return c.json({ error: `Error obteniendo transportista: ${errMsg(error)}` }, 500);
  }
});

// POST /transportistas
transportistas.post("/", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    if (!body.nombre) {
      return c.json({ error: "nombre es requerido" }, 400);
    }

    const { data, error } = await supabase
      .from("transportistas")
      .insert({ ...body, activo: body.activo ?? true })
      .select()
      .single();

    if (error) throw error;
    return c.json({ data }, 201);
  } catch (error) {
    console.log("Error creando transportista:", JSON.stringify(error));
    return c.json({ error: `Error creando transportista: ${errMsg(error)}` }, 500);
  }
});

// PUT /transportistas/:id
transportistas.put("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("transportistas")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", c.req.param("id"))
      .select()
      .single();

    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error actualizando transportista:", JSON.stringify(error));
    return c.json({ error: `Error actualizando transportista: ${errMsg(error)}` }, 500);
  }
});

// DELETE /transportistas/:id
transportistas.delete("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("transportistas")
      .delete()
      .eq("id", c.req.param("id"));

    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.log("Error eliminando transportista:", JSON.stringify(error));
    return c.json({ error: `Error eliminando transportista: ${errMsg(error)}` }, 500);
  }
});

// GET /transportistas/:id/tramos
transportistas.get("/:id/tramos", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("tramos")
      .select("*")
      .eq("transportista_id", c.req.param("id"))
      .order("created_at", { ascending: false });

    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error listando tramos:", JSON.stringify(error));
    return c.json({ error: `Error listando tramos: ${errMsg(error)}` }, 500);
  }
});

// POST /transportistas/:id/tramos
transportistas.post("/:id/tramos", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    if (!body.origen || !body.destino) {
      return c.json({ error: "origen y destino son requeridos" }, 400);
    }

    const { data, error } = await supabase
      .from("tramos")
      .insert({ ...body, transportista_id: c.req.param("id"), activo: body.activo ?? true })
      .select()
      .single();

    if (error) throw error;
    return c.json({ data }, 201);
  } catch (error) {
    console.log("Error creando tramo:", JSON.stringify(error));
    return c.json({ error: `Error creando tramo: ${errMsg(error)}` }, 500);
  }
});

export { transportistas };
