import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";

const metodosPago = new Hono();

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

// GET /metodos-pago
metodosPago.get("/", async (c) => {
  try {
    const supabase = getSupabase();
    const { activo, tipo } = c.req.query();

    let query = supabase
      .from("metodos_pago")
      .select("*")
      .order("orden", { ascending: true })
      .order("created_at", { ascending: true });

    if (activo !== undefined) query = query.eq("activo", activo === "true");
    if (tipo)                 query = query.eq("tipo", tipo);

    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error listando métodos de pago:", JSON.stringify(error));
    return c.json({ error: `Error listando métodos de pago: ${errMsg(error)}` }, 500);
  }
});

// GET /metodos-pago/:id
metodosPago.get("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("metodos_pago")
      .select("*")
      .eq("id", c.req.param("id"))
      .single();

    if (error) throw error;
    if (!data) return c.json({ error: "Método de pago no encontrado" }, 404);
    return c.json({ data });
  } catch (error) {
    console.log("Error obteniendo método de pago:", JSON.stringify(error));
    return c.json({ error: `Error obteniendo método de pago: ${errMsg(error)}` }, 500);
  }
});

// POST /metodos-pago
metodosPago.post("/", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    if (!body.nombre) return c.json({ error: "El nombre es requerido" }, 400);
    if (!body.tipo)   return c.json({ error: "El tipo es requerido" }, 400);

    const payload = {
      ...body,
      activo: body.activo ?? true,
      orden: body.orden ?? 0,
    };

    const { data, error } = await supabase
      .from("metodos_pago")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return c.json({ data }, 201);
  } catch (error) {
    console.log("Error creando método de pago:", JSON.stringify(error));
    return c.json({ error: `Error creando método de pago: ${errMsg(error)}` }, 500);
  }
});

// PUT /metodos-pago/:id
metodosPago.put("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("metodos_pago")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", c.req.param("id"))
      .select()
      .single();

    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error actualizando método de pago:", JSON.stringify(error));
    return c.json({ error: `Error actualizando método de pago: ${errMsg(error)}` }, 500);
  }
});

// DELETE /metodos-pago/:id
metodosPago.delete("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("metodos_pago")
      .delete()
      .eq("id", c.req.param("id"));

    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.log("Error eliminando método de pago:", JSON.stringify(error));
    return c.json({ error: `Error eliminando método de pago: ${errMsg(error)}` }, 500);
  }
});

export { metodosPago };
