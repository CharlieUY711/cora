import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";

const disputas = new Hono();

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

// GET /disputas
disputas.get("/", async (c) => {
  try {
    const supabase = getSupabase();
    const { estado, producto_id } = c.req.query();
    let query = supabase
      .from("disputas")
      .select("*")
      .order("created_at", { ascending: false });
    if (estado) query = query.eq("estado", estado);
    if (producto_id) query = query.eq("producto_id", producto_id);
    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error listando disputas:", JSON.stringify(error));
    return c.json({ error: `Error listando disputas: ${errMsg(error)}` }, 500);
  }
});

// GET /disputas/:id
disputas.get("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("disputas")
      .select("*")
      .eq("id", c.req.param("id"))
      .single();

    if (error) throw error;
    if (!data) return c.json({ error: "Disputa no encontrada" }, 404);
    return c.json({ data });
  } catch (error) {
    console.log("Error obteniendo disputa:", JSON.stringify(error));
    return c.json({ error: `Error obteniendo disputa: ${errMsg(error)}` }, 500);
  }
});

// POST /disputas
disputas.post("/", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    if (!body.motivo) {
      return c.json({ error: "motivo es requerido" }, 400);
    }
    if (!body.producto_id) {
      return c.json({ error: "producto_id es requerido" }, 400);
    }

    const { data, error } = await supabase
      .from("disputas")
      .insert({ ...body, estado: body.estado ?? "abierta" })
      .select()
      .single();

    if (error) throw error;
    return c.json({ data }, 201);
  } catch (error) {
    console.log("Error creando disputa:", JSON.stringify(error));
    return c.json({ error: `Error creando disputa: ${errMsg(error)}` }, 500);
  }
});

// PUT /disputas/:id
disputas.put("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("disputas")
      .update(body)
      .eq("id", c.req.param("id"))
      .select()
      .single();

    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error actualizando disputa:", JSON.stringify(error));
    return c.json({ error: `Error actualizando disputa: ${errMsg(error)}` }, 500);
  }
});

// DELETE /disputas/:id
disputas.delete("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("disputas")
      .delete()
      .eq("id", c.req.param("id"));

    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.log("Error eliminando disputa:", JSON.stringify(error));
    return c.json({ error: `Error eliminando disputa: ${errMsg(error)}` }, 500);
  }
});

export { disputas };
