import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";

const departamentos = new Hono();

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

// GET /departamentos
departamentos.get("/", async (c) => {
  try {
    const supabase = getSupabase();
    const { activo, search } = c.req.query();

    let query = supabase
      .from("departamentos")
      .select("*")
      .order("orden", { ascending: true });

    if (activo !== undefined) query = query.eq("activo", activo === "true");
    if (search)               query = query.ilike("nombre", `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error listando departamentos:", JSON.stringify(error));
    return c.json({ error: `Error listando departamentos: ${errMsg(error)}` }, 500);
  }
});

// GET /departamentos/:id
departamentos.get("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("departamentos")
      .select("*")
      .eq("id", c.req.param("id"))
      .single();

    if (error) throw error;
    if (!data) return c.json({ error: "Departamento no encontrado" }, 404);
    return c.json({ data });
  } catch (error) {
    console.log("Error obteniendo departamento:", JSON.stringify(error));
    return c.json({ error: `Error obteniendo departamento: ${errMsg(error)}` }, 500);
  }
});

// POST /departamentos
departamentos.post("/", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    if (!body.nombre) {
      return c.json({ error: "nombre es requerido" }, 400);
    }

    const { data, error } = await supabase
      .from("departamentos")
      .insert({ ...body, activo: body.activo ?? true })
      .select()
      .single();

    if (error) throw error;
    return c.json({ data }, 201);
  } catch (error) {
    console.log("Error creando departamento:", JSON.stringify(error));
    return c.json({ error: `Error creando departamento: ${errMsg(error)}` }, 500);
  }
});

// PUT /departamentos/:id
departamentos.put("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("departamentos")
      .update(body)
      .eq("id", c.req.param("id"))
      .select()
      .single();

    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error actualizando departamento:", JSON.stringify(error));
    return c.json({ error: `Error actualizando departamento: ${errMsg(error)}` }, 500);
  }
});

// DELETE /departamentos/:id
departamentos.delete("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("departamentos")
      .delete()
      .eq("id", c.req.param("id"));

    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.log("Error eliminando departamento:", JSON.stringify(error));
    return c.json({ error: `Error eliminando departamento: ${errMsg(error)}` }, 500);
  }
});

export { departamentos };

