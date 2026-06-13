import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";

const productos = new Hono();

const getSupabase = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

const errMsg = (e: unknown): string =>
  e instanceof Error ? e.message
  : typeof e === "object" && e !== null && "message" in e
  ? String((e as { message: unknown }).message)
  : JSON.stringify(e);

// =============================================================
// PRODUCTOS
// =============================================================

// GET /productos/market
productos.get("/market", async (c) => {
  try {
    const supabase = getSupabase();
    const {
      departamento, categoria, subcategoria,
      vendedor_id, tienda_id, estado, marca, proveedor, search,
      limit: lim, offset: off, order_by, order_dir,
    } = c.req.query();

    let query = supabase
      .from("productos_market")
      .select("*")
      .order(order_by ?? "created_at", { ascending: order_dir === "asc" });

    if (departamento)  query = query.eq("departamento", departamento);
    if (categoria)     query = query.eq("categoria", categoria);
    if (subcategoria)  query = query.eq("subcategoria", subcategoria);
    if (vendedor_id)   query = query.eq("vendedor_id", vendedor_id);
    if (tienda_id)     query = query.eq("tienda_id", tienda_id);
    if (estado)        query = query.eq("estado", estado);
    if (marca)         query = query.eq("marca", marca);
    if (proveedor)     query = query.eq("proveedor", proveedor);
    if (search)        query = query.ilike("nombre", `%${search}%`);
    if (lim)           query = query.limit(parseInt(lim));
    if (off)           query = query.range(parseInt(off), parseInt(off) + parseInt(lim ?? "50") - 1);

    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data: (data ?? []).map((p: any) => ({ ...p, precio: p.precio_1 })) });
  } catch (error) {
    return c.json({ error: `Error listando productos: ${errMsg(error)}` }, 500);
  }
});

// GET /productos/market/:id
productos.get("/market/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const id = c.req.param("id");

    const [productoRes, variantesRes, sustitutosRes, comentariosRes] = await Promise.all([
      supabase.from("productos_market").select("*").eq("id", id).single(),
      supabase.from("variantes").select("*").eq("producto_id", id).order("created_at"),
      supabase.from("sustitutos").select("*, sustituto:producto_sustituto_id(id, nombre, imagen_principal, precio_1, estado)").eq("producto_id", id).order("orden"),
      supabase.from("producto_comentarios").select("*").eq("producto_id", id).order("created_at", { ascending: false }),
    ]);

    if (productoRes.error) throw productoRes.error;
    if (!productoRes.data) return c.json({ error: "Producto no encontrado" }, 404);

    // Incrementar visitas
    await supabase
      .from("productos_market")
      .update({ visitas: (productoRes.data.visitas ?? 0) + 1 })
      .eq("id", id);

    return c.json({
      data: {
        ...productoRes.data,
        precio: productoRes.data.precio_1,
        variantes:   variantesRes.data ?? [],
        sustitutos:  sustitutosRes.data ?? [],
        comentarios: comentariosRes.data ?? [],
      }
    });
  } catch (error) {
    return c.json({ error: `Error obteniendo producto: ${errMsg(error)}` }, 500);
  }
});

// POST /productos/market
productos.post("/market", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    if (!body.nombre) return c.json({ error: "nombre es requerido" }, 400);

    const { variantes, sustitutos, ...productoData } = body;

    const { data, error } = await supabase
      .from("productos_market")
      .insert({ ...productoData, estado: productoData.estado ?? "activo" })
      .select()
      .single();

    if (error) throw error;

    // Insertar variantes si vienen
    if (variantes?.length) {
      await supabase.from("variantes").insert(
        variantes.map((v: any) => ({ ...v, producto_id: data.id }))
      );
    }

    // Insertar sustitutos si vienen
    if (sustitutos?.length) {
      await supabase.from("sustitutos").insert(
        sustitutos.map((s: any) => ({ ...s, producto_id: data.id }))
      );
    }

    return c.json({ data }, 201);
  } catch (error) {
    return c.json({ error: `Error creando producto: ${errMsg(error)}` }, 500);
  }
});

// PUT /productos/market/:id
productos.put("/market/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const id = c.req.param("id");
    const body = await c.req.json();
    const { variantes, sustitutos, comentarios, ...productoData } = body;

    const { data, error } = await supabase
      .from("productos_market")
      .update(productoData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Reemplazar variantes si vienen
    if (variantes !== undefined) {
      await supabase.from("variantes").delete().eq("producto_id", id);
      if (variantes.length) {
        await supabase.from("variantes").insert(
          variantes.map((v: any) => ({ ...v, producto_id: id }))
        );
      }
    }

    // Reemplazar sustitutos si vienen
    if (sustitutos !== undefined) {
      await supabase.from("sustitutos").delete().eq("producto_id", id);
      if (sustitutos.length) {
        await supabase.from("sustitutos").insert(
          sustitutos.map((s: any) => ({ ...s, producto_id: id }))
        );
      }
    }

    return c.json({ data });
  } catch (error) {
    return c.json({ error: `Error actualizando producto: ${errMsg(error)}` }, 500);
  }
});

// DELETE /productos/market/:id
productos.delete("/market/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("productos_market")
      .delete()
      .eq("id", c.req.param("id"));

    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: `Error eliminando producto: ${errMsg(error)}` }, 500);
  }
});

// =============================================================
// COMENTARIOS INTERNOS
// =============================================================

// POST /productos/market/:id/comentarios
productos.post("/market/:id/comentarios", async (c) => {
  try {
    const supabase = getSupabase();
    const { autor, comentario } = await c.req.json();

    if (!comentario) return c.json({ error: "comentario es requerido" }, 400);

    const { data, error } = await supabase
      .from("producto_comentarios")
      .insert({ producto_id: c.req.param("id"), autor, comentario })
      .select()
      .single();

    if (error) throw error;
    return c.json({ data }, 201);
  } catch (error) {
    return c.json({ error: `Error agregando comentario: ${errMsg(error)}` }, 500);
  }
});

// =============================================================
// VARIANTES
// =============================================================

// PUT /productos/market/variantes/:id
productos.put("/market/variantes/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("variantes")
      .update(body)
      .eq("id", c.req.param("id"))
      .select()
      .single();

    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    return c.json({ error: `Error actualizando variante: ${errMsg(error)}` }, 500);
  }
});

// DELETE /productos/market/variantes/:id
productos.delete("/market/variantes/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("variantes")
      .delete()
      .eq("id", c.req.param("id"));

    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: `Error eliminando variante: ${errMsg(error)}` }, 500);
  }
});


// --------------------------------------------------------------
// SECONDHAND
// --------------------------------------------------------------

// GET /productos/secondhand
productos.get("/secondhand", async (c) => {
  try {
    const supabase = getSupabase();
    const { departamento, estado, search, limit: lim, offset: off, order_by, order_dir } = c.req.query();
    let query = supabase.from("productos_secondhand").select("*").order(order_by ?? "created_at", { ascending: order_dir === "asc" });
    if (departamento) query = query.eq("departamento", departamento);
    if (estado)       query = query.eq("estado", estado);
    if (search)       query = query.ilike("nombre", `%${search}%`);
    if (lim)          query = query.limit(parseInt(lim));
    if (off)          query = query.range(parseInt(off), parseInt(off) + parseInt(lim ?? "50") - 1);
    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data: (data ?? []).map((p: any) => ({ ...p, precio: p.precio_1 })) });
  } catch (error) {
    return c.json({ error: `Error listando productos secondhand: ${errMsg(error)}` }, 500);
  }
});

// GET /productos/secondhand/:id
productos.get("/secondhand/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("productos_secondhand").select("*").eq("id", c.req.param("id")).single();
    if (error) throw error;
    if (!data) return c.json({ error: "Producto no encontrado" }, 404);
    return c.json({ data: { ...data, precio: data.precio_1 } });
  } catch (error) {
    return c.json({ error: `Error obteniendo producto secondhand: ${errMsg(error)}` }, 500);
  }
});

// POST /productos/secondhand
productos.post("/secondhand", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();
    if (!body.nombre) return c.json({ error: "nombre es requerido" }, 400);
    const { data, error } = await supabase.from("productos_secondhand").insert({ ...body, estado: body.estado ?? "activo" }).select().single();
    if (error) throw error;
    return c.json({ data }, 201);
  } catch (error) {
    return c.json({ error: `Error creando producto secondhand: ${errMsg(error)}` }, 500);
  }
});

// PUT /productos/secondhand/:id
productos.put("/secondhand/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();
    const { data, error } = await supabase.from("productos_secondhand").update(body).eq("id", c.req.param("id")).select().single();
    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    return c.json({ error: `Error actualizando producto secondhand: ${errMsg(error)}` }, 500);
  }
});

// DELETE /productos/secondhand/:id
productos.delete("/secondhand/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("productos_secondhand").delete().eq("id", c.req.param("id"));
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: `Error eliminando producto secondhand: ${errMsg(error)}` }, 500);
  }
});
export { productos };


