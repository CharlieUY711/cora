import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";

const pedidos = new Hono();

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

const ESTADOS_VALIDOS = [
  "pendiente", "confirmado", "en_preparacion",
  "enviado", "entregado", "cancelado", "devuelto",
];

const ESTADOS_PAGO_VALIDOS = [
  "pendiente", "pagado", "parcial", "fallido", "reembolsado",
];

// Transiciones válidas de estado
const TRANSICIONES: Record<string, string[]> = {
  pendiente:       ["confirmado", "cancelado"],
  confirmado:      ["en_preparacion", "cancelado"],
  en_preparacion:  ["enviado", "cancelado"],
  enviado:         ["entregado", "cancelado"],
  entregado:       ["devuelto"],
  cancelado:       [],
  devuelto:        [],
};

function generarNumeroPedido(): string {
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${fecha}-${rand}`;
}

// GET /pedidos — listar con filtros
pedidos.get("/", async (c) => {
  try {
    const supabase = getSupabase();
    const {
      estado, estado_pago, cliente_persona_id, cliente_org_id,
      fecha_desde, fecha_hasta, search, limit: lim, offset: off,
    } = c.req.query();

    let query = supabase
      .from("pedidos")
      .select(`
        *,
        cliente_persona:personas(id, nombre, apellido, email, telefono),
        cliente_org:organizaciones(id, nombre, tipo),
        metodo_pago:metodos_pago(id, nombre, tipo, proveedor),
        metodo_envio:metodos_envio(id, nombre, tipo, precio)
      `)
      .order("created_at", { ascending: false });

    if (estado)              query = query.eq("estado", estado);
    if (estado_pago)         query = query.eq("estado_pago", estado_pago);
    if (cliente_persona_id)  query = query.eq("cliente_persona_id", cliente_persona_id);
    if (cliente_org_id)      query = query.eq("cliente_org_id", cliente_org_id);
    if (fecha_desde)         query = query.gte("created_at", fecha_desde);
    if (fecha_hasta)         query = query.lte("created_at", fecha_hasta + "T23:59:59Z");
    if (search)              query = query.ilike("numero_pedido", `%${search}%`);
    if (lim)                 query = query.limit(parseInt(lim));
    if (off)                 query = query.range(parseInt(off), parseInt(off) + parseInt(lim ?? "50") - 1);

    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error listando pedidos:", JSON.stringify(error));
    return c.json({ error: `Error listando pedidos: ${errMsg(error)}` }, 500);
  }
});

// GET /pedidos/:id
pedidos.get("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("pedidos")
      .select(`
        *,
        cliente_persona:personas(id, nombre, apellido, email, telefono),
        cliente_org:organizaciones(id, nombre, tipo),
        metodo_pago:metodos_pago(id, nombre, tipo, proveedor),
        metodo_envio:metodos_envio(id, nombre, tipo, precio)
      `)
      .eq("id", c.req.param("id"))
      .single();

    if (error) throw error;
    if (!data) return c.json({ error: "Pedido no encontrado" }, 404);
    return c.json({ data });
  } catch (error) {
    console.log("Error obteniendo pedido:", JSON.stringify(error));
    return c.json({ error: `Error obteniendo pedido: ${errMsg(error)}` }, 500);
  }
});

// POST /pedidos — crear
pedidos.post("/", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return c.json({ error: "El pedido debe tener al menos un ítem" }, 400);
    }
    if (!body.cliente_persona_id && !body.cliente_org_id) {
      return c.json({ error: "El pedido requiere un cliente (persona u organización)" }, 400);
    }

    // Calcular totales si no vienen
    const subtotal = body.subtotal ?? body.items.reduce((s: number, i: { subtotal?: number; cantidad?: number; precio_unitario?: number }) => s + (i.subtotal ?? (i.cantidad ?? 0) * (i.precio_unitario ?? 0)), 0);
    const descuento = body.descuento ?? 0;
    const impuestos = body.impuestos ?? 0;
    const total = body.total ?? (subtotal - descuento + impuestos);

    const payload = {
      ...body,
      numero_pedido: body.numero_pedido ?? generarNumeroPedido(),
      estado:        body.estado ?? "pendiente",
      estado_pago:   body.estado_pago ?? "pendiente",
      subtotal,
      descuento,
      impuestos,
      total,
    };

    const { data, error } = await supabase
      .from("pedidos")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return c.json({ data }, 201);
  } catch (error) {
    console.log("Error creando pedido:", JSON.stringify(error));
    return c.json({ error: `Error creando pedido: ${errMsg(error)}` }, 500);
  }
});

// PUT /pedidos/:id — actualizar datos generales
pedidos.put("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    // Recalcular total si cambian items
    let extra: Record<string, number> = {};
    if (body.items) {
      const subtotal = body.items.reduce((s: number, i: { subtotal?: number; cantidad?: number; precio_unitario?: number }) => s + (i.subtotal ?? (i.cantidad ?? 0) * (i.precio_unitario ?? 0)), 0);
      const descuento = body.descuento ?? 0;
      const impuestos = body.impuestos ?? 0;
      extra = { subtotal, total: subtotal - descuento + impuestos };
    }

    const { data, error } = await supabase
      .from("pedidos")
      .update({ ...body, ...extra, updated_at: new Date().toISOString() })
      .eq("id", c.req.param("id"))
      .select()
      .single();

    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error actualizando pedido:", JSON.stringify(error));
    return c.json({ error: `Error actualizando pedido: ${errMsg(error)}` }, 500);
  }
});

// PUT /pedidos/:id/estado — máquina de estados
pedidos.put("/:id/estado", async (c) => {
  try {
    const supabase = getSupabase();
    const { nuevo_estado } = await c.req.json();

    if (!ESTADOS_VALIDOS.includes(nuevo_estado)) {
      return c.json({ error: `Estado inválido: ${nuevo_estado}` }, 400);
    }

    // Obtener estado actual
    const { data: actual, error: fetchErr } = await supabase
      .from("pedidos")
      .select("estado")
      .eq("id", c.req.param("id"))
      .single();

    if (fetchErr || !actual) return c.json({ error: "Pedido no encontrado" }, 404);

    const transicionesPermitidas = TRANSICIONES[actual.estado] ?? [];
    if (!transicionesPermitidas.includes(nuevo_estado)) {
      return c.json({
        error: `Transición no permitida: ${actual.estado} → ${nuevo_estado}. Permitidas: ${transicionesPermitidas.join(", ") || "ninguna"}`,
      }, 400);
    }

    const { data, error } = await supabase
      .from("pedidos")
      .update({ estado: nuevo_estado, updated_at: new Date().toISOString() })
      .eq("id", c.req.param("id"))
      .select()
      .single();

    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error cambiando estado pedido:", JSON.stringify(error));
    return c.json({ error: `Error cambiando estado: ${errMsg(error)}` }, 500);
  }
});

// PUT /pedidos/:id/estado-pago
pedidos.put("/:id/estado-pago", async (c) => {
  try {
    const supabase = getSupabase();
    const { estado_pago } = await c.req.json();

    if (!ESTADOS_PAGO_VALIDOS.includes(estado_pago)) {
      return c.json({ error: `Estado de pago inválido: ${estado_pago}` }, 400);
    }

    const { data, error } = await supabase
      .from("pedidos")
      .update({ estado_pago, updated_at: new Date().toISOString() })
      .eq("id", c.req.param("id"))
      .select()
      .single();

    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error cambiando estado de pago:", JSON.stringify(error));
    return c.json({ error: `Error cambiando estado de pago: ${errMsg(error)}` }, 500);
  }
});

// DELETE /pedidos/:id
pedidos.delete("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("pedidos")
      .delete()
      .eq("id", c.req.param("id"));

    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.log("Error eliminando pedido:", JSON.stringify(error));
    return c.json({ error: `Error eliminando pedido: ${errMsg(error)}` }, 500);
  }
});

export { pedidos };

