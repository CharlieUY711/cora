import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";

const organizaciones = new Hono();

const getSupabase = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

// GET /organizaciones
organizaciones.get("/", async (c) => {
  try {
    const supabase = getSupabase();
    const { tipo, activo, search } = c.req.query();

    let query = supabase
      .from("organizaciones")
      .select("*")
      .order("created_at", { ascending: false });

    if (tipo) query = query.eq("tipo", tipo);
    if (activo !== undefined) query = query.eq("activo", activo === "true");
    if (search) {
      query = query.or(
        `nombre.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error listando organizaciones:", error);
    return c.json({ error: `Error listando organizaciones: ${error}` }, 500);
  }
});

// GET /organizaciones/:id
organizaciones.get("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("organizaciones")
      .select("*")
      .eq("id", c.req.param("id"))
      .single();

    if (error) throw error;
    if (!data) return c.json({ error: "Organización no encontrada" }, 404);
    return c.json({ data });
  } catch (error) {
    console.log("Error obteniendo organización:", error);
    return c.json({ error: `Error obteniendo organización: ${error}` }, 500);
  }
});

// POST /organizaciones
organizaciones.post("/", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("organizaciones")
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return c.json({ data }, 201);
  } catch (error) {
    console.log("Error creando organización:", error);
    return c.json({ error: `Error creando organización: ${error}` }, 500);
  }
});

// PUT /organizaciones/:id
organizaciones.put("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("organizaciones")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", c.req.param("id"))
      .select()
      .single();

    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error actualizando organización:", error);
    return c.json({ error: `Error actualizando organización: ${error}` }, 500);
  }
});

// DELETE /organizaciones/:id
organizaciones.delete("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("organizaciones")
      .delete()
      .eq("id", c.req.param("id"));

    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.log("Error eliminando organización:", error);
    return c.json({ error: `Error eliminando organización: ${error}` }, 500);
  }
});

export { organizaciones };

