import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";

// Alias de /ordenes → pedidos
// El frontstore (ODDY_Front2) llama a /ordenes pero la tabla es pedidos
// Este archivo adapta los campos que espera el frontstore

const ordenes = new Hono();

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

function generarNumeroOrden(): string {
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${fecha}-${rand}`;
}

// Mapea pedido DB → orden frontend
function mapPedidoToOrden(p: Record<string, unknown>) {
  return {
    id:             p.id,
    numero_orden:   p.numero_pedido,
    usuario_id:     p.cliente_persona_id ?? null,
    sesion_id:      null,
    estado:         p.estado,
    subtotal:       p.subtotal,
    impuestos:      p.impuestos ?? 0,
    envio:          (p.metodo_envio as Record<string,unknown>)?.precio ?? 0,
    total:          p.total,
    metodo_pago:    (p.metodo_pago as Record<string,unknown>)?.nombre ?? p.metodo_pago_id ?? null,
    estado_pago:    p.estado_pago,
    nombre_completo: (p.direccion_envio as Record<string,unknown>)?.nombre ?? "",
    email:          (p.direccion_envio as Record<string,unknown>)?.email ?? "",
    telefono:       (p.direccion_envio as Record<string,unknown>)?.telefono ?? null,
    direccion:      (p.direccion_envio as Record<string,unknown>)?.direccion ?? "",
    ciudad:         (p.direccion_envio as Record<string,unknown>)?.ciudad ?? "",
    codigo_postal:  (p.direccion_envio as Record<string,unknown>)?.codigo_postal ?? null,
    pais:           (p.direccion_envio as Record<string,unknown>)?.pais ?? "UY",
    notas:          p.notas,
    created_at:     p.created_at,
    updated_at:     p.updated_at,
    items:          p.items ?? [],
  };
}

// GET /ordenes?sesion_id=xxx
ordenes.get("/", async (c) => {
  try {
    const supabase = getSupabase();
    const { sesion_id, usuario_id } = c.req.query();

    let query = supabase
      .from("pedidos")
      .select("*, metodo_pago:metodos_pago(id,nombre), metodo_envio:metodos_envio(id,nombre,precio)")
      .order("created_at", { ascending: false });

    if (usuario_id) query = query.eq("cliente_persona_id", usuario_id);

    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data: (data ?? []).map(mapPedidoToOrden) });
  } catch (error) {
    console.log("Error listando órdenes:", JSON.stringify(error));
    return c.json({ error: `Error listando órdenes: ${errMsg(error)}` }, 500);
  }
});

// GET /ordenes/:id
ordenes.get("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("pedidos")
      .select("*, metodo_pago:metodos_pago(id,nombre), metodo_envio:metodos_envio(id,nombre,precio)")
      .eq("id", c.req.param("id"))
      .single();

    if (error) throw error;
    if (!data) return c.json({ error: "Orden no encontrada" }, 404);
    return c.json({ data: mapPedidoToOrden(data) });
  } catch (error) {
    console.log("Error obteniendo orden:", JSON.stringify(error));
    return c.json({ error: `Error obteniendo orden: ${errMsg(error)}` }, 500);
  }
});

// POST /ordenes — crear desde checkout del frontstore
ordenes.post("/", async (c) => {
  try {
    const supabase = getSupabase();
    const { sesion_id } = c.req.query();
    const body = await c.req.json();

    // Obtener items del carrito si no vienen en el body
    let items = body.items ?? [];
    if (items.length === 0 && sesion_id) {
      const { data: carritoItems } = await supabase
        .from("carrito")
        .select("*")
        .eq("sesion_id", sesion_id);
      items = (carritoItems ?? []).map((i: Record<string,unknown>) => ({
        producto_id:    i.producto_id,
        cantidad:       i.cantidad,
        precio_unitario: i.precio_unitario,
        subtotal:       (i.cantidad as number) * (i.precio_unitario as number),
      }));
    }

    if (items.length === 0) {
      return c.json({ error: "La orden debe tener al menos un ítem" }, 400);
    }

    const subtotal  = items.reduce((s: number, i: Record<string,unknown>) => s + ((i.subtotal as number) ?? 0), 0);
    const impuestos = body.impuestos ?? 0;
    const envio     = body.envio ?? 0;
    const total     = subtotal + impuestos + envio;

    const payload = {
      numero_pedido:   generarNumeroOrden(),
      estado:          "pendiente",
      estado_pago:     "pendiente",
      items,
      subtotal,
      impuestos,
      total,
      direccion_envio: {
        nombre:        body.nombre_completo,
        email:         body.email,
        telefono:      body.telefono ?? null,
        direccion:     body.direccion,
        ciudad:        body.ciudad,
        codigo_postal: body.codigo_postal ?? null,
        pais:          body.pais ?? "UY",
      },
      notas: body.notas ?? null,
    };

    const { data, error } = await supabase
      .from("pedidos")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    // Vaciar carrito después de crear la orden
    if (sesion_id) {
      await supabase
        .from("carrito")
        .delete()
        .eq("sesion_id", sesion_id);
    }

    return c.json({ data: mapPedidoToOrden(data) }, 201);
  } catch (error) {
    console.log("Error creando orden:", JSON.stringify(error));
    return c.json({ error: `Error creando orden: ${errMsg(error)}` }, 500);
  }
});

export { ordenes };


