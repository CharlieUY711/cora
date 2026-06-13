import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";

const roles = new Hono();

const getSupabase = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

// GET /roles - listar con filtros
roles.get("/", async (c) => {
  try {
    const supabase = getSupabase();
    const { persona_id, organizacion_id, rol, activo } = c.req.query();

    let query = supabase
      .from("roles_contextuales")
      .select(`
        *,
        persona:personas(id, nombre, apellido, email, tipo),
        organizacion:organizaciones(id, nombre, tipo)
      `)
      .order("created_at", { ascending: false });

    if (persona_id) query = query.eq("persona_id", persona_id);
    if (organizacion_id) query = query.eq("organizacion_id", organizacion_id);
    if (rol) query = query.eq("rol", rol);
    if (activo !== undefined) query = query.eq("activo", activo === "true");

    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error listando roles:", error);
    return c.json({ error: `Error listando roles: ${error}` }, 500);
  }
});

// GET /roles/:id
roles.get("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("roles_contextuales")
      .select(`
        *,
        persona:personas(id, nombre, apellido, email, tipo),
        organizacion:organizaciones(id, nombre, tipo)
      `)
      .eq("id", c.req.param("id"))
      .single();

    if (error) throw error;
    if (!data) return c.json({ error: "Rol no encontrado" }, 404);
    return c.json({ data });
  } catch (error) {
    console.log("Error obteniendo rol:", error);
    return c.json({ error: `Error obteniendo rol: ${error}` }, 500);
  }
});

// POST /roles
roles.post("/", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("roles_contextuales")
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return c.json({ data }, 201);
  } catch (error) {
    console.log("Error creando rol:", error);
    return c.json({ error: `Error creando rol: ${error}` }, 500);
  }
});

// PUT /roles/:id
roles.put("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("roles_contextuales")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", c.req.param("id"))
      .select()
      .single();

    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error actualizando rol:", error);
    return c.json({ error: `Error actualizando rol: ${error}` }, 500);
  }
});

// DELETE /roles/:id
roles.delete("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("roles_contextuales")
      .delete()
      .eq("id", c.req.param("id"));

    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.log("Error eliminando rol:", error);
    return c.json({ error: `Error eliminando rol: ${error}` }, 500);
  }
});

export { roles };


