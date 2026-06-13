import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";

const carrito = new Hono();

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

// GET /carrito?sesion_id=xxx  (o usuario_id via JWT)
carrito.get("/", async (c) => {
  try {
    const supabase = getSupabase();
    const { sesion_id, usuario_id } = c.req.query();

    if (!sesion_id && !usuario_id) {
      return c.json({ error: "Se requiere sesion_id o usuario_id" }, 400);
    }

    let query = supabase
      .from("carrito")
      .select("*")
      .order("created_at", { ascending: true });

    if (usuario_id) query = query.eq("usuario_id", usuario_id);
    else            query = query.eq("sesion_id", sesion_id);

    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error obteniendo carrito:", JSON.stringify(error));
    return c.json({ error: `Error obteniendo carrito: ${errMsg(error)}` }, 500);
  }
});

// POST /carrito?sesion_id=xxx — agregar item
carrito.post("/", async (c) => {
  try {
    const supabase = getSupabase();
    const { sesion_id, usuario_id } = c.req.query();
    const body = await c.req.json();

    if (!sesion_id && !usuario_id) {
      return c.json({ error: "Se requiere sesion_id o usuario_id" }, 400);
    }
    if (!body.producto_id || !body.producto_tipo || !body.precio_unitario) {
      return c.json({ error: "producto_id, producto_tipo y precio_unitario son requeridos" }, 400);
    }

    // Si ya existe el producto en el carrito, sumar cantidad
    let existingQuery = supabase
      .from("carrito")
      .select("*")
      .eq("producto_id", body.producto_id)
      .eq("producto_tipo", body.producto_tipo);

    if (usuario_id) existingQuery = existingQuery.eq("usuario_id", usuario_id);
    else            existingQuery = existingQuery.eq("sesion_id", sesion_id);

    const { data: existing } = await existingQuery.single();

    if (existing) {
      const { data, error } = await supabase
        .from("carrito")
        .update({
          cantidad: existing.cantidad + (body.cantidad ?? 1),
          precio_unitario: body.precio_unitario,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return c.json({ data });
    }

    // Insertar nuevo item
    const payload = {
      sesion_id: usuario_id ? null : sesion_id,
      usuario_id: usuario_id ?? null,
      producto_id: body.producto_id,
      producto_tipo: body.producto_tipo,
      cantidad: body.cantidad ?? 1,
      precio_unitario: body.precio_unitario,
    };

    const { data, error } = await supabase
      .from("carrito")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return c.json({ data }, 201);
  } catch (error) {
    console.log("Error agregando al carrito:", JSON.stringify(error));
    return c.json({ error: `Error agregando al carrito: ${errMsg(error)}` }, 500);
  }
});

// PUT /carrito/:id?sesion_id=xxx — actualizar cantidad
carrito.put("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { sesion_id, usuario_id } = c.req.query();
    const { cantidad } = await c.req.json();

    if (cantidad < 1) {
      return c.json({ error: "La cantidad debe ser mayor a 0" }, 400);
    }

    let query = supabase
      .from("carrito")
      .update({ cantidad, updated_at: new Date().toISOString() })
      .eq("id", c.req.param("id"));

    if (usuario_id) query = query.eq("usuario_id", usuario_id);
    else if (sesion_id) query = query.eq("sesion_id", sesion_id);

    const { data, error } = await query.select().single();
    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error actualizando item carrito:", JSON.stringify(error));
    return c.json({ error: `Error actualizando item carrito: ${errMsg(error)}` }, 500);
  }
});

// DELETE /carrito/:id?sesion_id=xxx — eliminar item
carrito.delete("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { sesion_id, usuario_id } = c.req.query();

    let query = supabase
      .from("carrito")
      .delete()
      .eq("id", c.req.param("id"));

    if (usuario_id) query = query.eq("usuario_id", usuario_id);
    else if (sesion_id) query = query.eq("sesion_id", sesion_id);

    const { error } = await query;
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.log("Error eliminando item carrito:", JSON.stringify(error));
    return c.json({ error: `Error eliminando item carrito: ${errMsg(error)}` }, 500);
  }
});

// DELETE /carrito?sesion_id=xxx — vaciar carrito completo
carrito.delete("/", async (c) => {
  try {
    const supabase = getSupabase();
    const { sesion_id, usuario_id } = c.req.query();

    if (!sesion_id && !usuario_id) {
      return c.json({ error: "Se requiere sesion_id o usuario_id" }, 400);
    }

    let query = supabase.from("carrito").delete();
    if (usuario_id) query = query.eq("usuario_id", usuario_id);
    else            query = query.eq("sesion_id", sesion_id);

    const { error } = await query;
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.log("Error vaciando carrito:", JSON.stringify(error));
    return c.json({ error: `Error vaciando carrito: ${errMsg(error)}` }, 500);
  }
});

export { carrito };

