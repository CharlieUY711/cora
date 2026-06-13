import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";

const mapaEnvios = new Hono();

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

// GET /mapa-envios
mapaEnvios.get("/", async (c) => {
  try {
    const supabase = getSupabase();
    const { tipo, estado, search } = c.req.query();

    let query = supabase
      .from("mapa_envios_puntos")
      .select("*")
      .order("created_at", { ascending: false });

    if (tipo) query = query.eq("tipo", tipo);
    if (estado) query = query.eq("estado", estado);
    if (search) query = query.or(`nombre.ilike.%${search}%,numero.ilike.%${search}%,cliente.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error listando puntos del mapa:", JSON.stringify(error));
    return c.json({ error: `Error listando puntos: ${errMsg(error)}` }, 500);
  }
});

// GET /mapa-envios/:id
mapaEnvios.get("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("mapa_envios_puntos")
      .select("*")
      .eq("id", c.req.param("id"))
      .single();

    if (error) throw error;
    if (!data) return c.json({ error: "Punto no encontrado" }, 404);
    return c.json({ data });
  } catch (error) {
    console.log("Error obteniendo punto:", JSON.stringify(error));
    return c.json({ error: `Error obteniendo punto: ${errMsg(error)}` }, 500);
  }
});

// POST /mapa-envios
mapaEnvios.post("/", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    if (!body.nombre || body.lat === undefined || body.lng === undefined) {
      return c.json({ error: "nombre, lat y lng son requeridos" }, 400);
    }

    const { data, error } = await supabase
      .from("mapa_envios_puntos")
      .insert({ ...body, estado: body.estado ?? 'activo' })
      .select()
      .single();

    if (error) throw error;
    return c.json({ data }, 201);
  } catch (error) {
    console.log("Error creando punto:", JSON.stringify(error));
    return c.json({ error: `Error creando punto: ${errMsg(error)}` }, 500);
  }
});

// PUT /mapa-envios/:id
mapaEnvios.put("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("mapa_envios_puntos")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", c.req.param("id"))
      .select()
      .single();

    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error actualizando punto:", JSON.stringify(error));
    return c.json({ error: `Error actualizando punto: ${errMsg(error)}` }, 500);
  }
});

// DELETE /mapa-envios/:id
mapaEnvios.delete("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("mapa_envios_puntos")
      .delete()
      .eq("id", c.req.param("id"));

    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.log("Error eliminando punto:", JSON.stringify(error));
    return c.json({ error: `Error eliminando punto: ${errMsg(error)}` }, 500);
  }
});

export { mapaEnvios };
