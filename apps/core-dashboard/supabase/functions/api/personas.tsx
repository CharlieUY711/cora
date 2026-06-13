import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";

const personas = new Hono();

const getSupabase = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

// GET /personas - listar con filtros opcionales
personas.get("/", async (c) => {
  try {
    const supabase = getSupabase();
    const { tipo, activo, search } = c.req.query();

    let query = supabase
      .from("personas")
      .select("*")
      .order("created_at", { ascending: false });

    if (tipo) query = query.eq("tipo", tipo);
    if (activo !== undefined) query = query.eq("activo", activo === "true");
    if (search) {
      query = query.or(
        `nombre.ilike.%${search}%,apellido.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error listando personas:", error);
    return c.json({ error: `Error listando personas: ${error}` }, 500);
  }
});

// GET /personas/:id
personas.get("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("personas")
      .select("*")
      .eq("id", c.req.param("id"))
      .single();

    if (error) throw error;
    if (!data) return c.json({ error: "Persona no encontrada" }, 404);
    return c.json({ data });
  } catch (error) {
    console.log("Error obteniendo persona:", error);
    return c.json({ error: `Error obteniendo persona: ${error}` }, 500);
  }
});

// POST /personas
personas.post("/", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("personas")
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return c.json({ data }, 201);
  } catch (error) {
    console.log("Error creando persona:", error);
    return c.json({ error: `Error creando persona: ${error}` }, 500);
  }
});

// PUT /personas/:id
personas.put("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("personas")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", c.req.param("id"))
      .select()
      .single();

    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error actualizando persona:", error);
    return c.json({ error: `Error actualizando persona: ${error}` }, 500);
  }
});

// DELETE /personas/:id
personas.delete("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("personas")
      .delete()
      .eq("id", c.req.param("id"));

    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.log("Error eliminando persona:", error);
    return c.json({ error: `Error eliminando persona: ${error}` }, 500);
  }
});

export { personas };

