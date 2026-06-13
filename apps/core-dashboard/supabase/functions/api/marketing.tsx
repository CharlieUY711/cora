/* =====================================================
   MARKETING — Backend Module
   Campañas, Suscriptores, Fidelización y Sorteos
   Charlie Marketplace Builder v1.5
   ===================================================== */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";

export const marketing = new Hono();

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

// ── CAMPAÑAS ─────────────────────────────────────────

/* GET /marketing/campanas */
marketing.get("/campanas", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("marketing_campanas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return c.json({ ok: true, data: data ?? [] });
  } catch (error) {
    console.log("Error GET /marketing/campanas:", JSON.stringify(error));
    return c.json({ ok: false, error: `Error listando campañas: ${errMsg(error)}` }, 500);
  }
});

/* POST /marketing/campanas */
marketing.post("/campanas", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    if (!body.nombre) {
      return c.json({ ok: false, error: "nombre es requerido" }, 400);
    }

    const payload = {
      nombre: body.nombre,
      asunto: body.asunto ?? null,
      contenido_html: body.contenido_html ?? null,
      estado: body.estado ?? "borrador",
      tipo: body.tipo ?? "email",
      segmento: body.segmento ?? {},
      programada_para: body.programada_para ?? null,
      total_destinatarios: body.total_destinatarios ?? 0,
    };

    const { data, error } = await supabase
      .from("marketing_campanas")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return c.json({ ok: true, data }, 201);
  } catch (error) {
    console.log("Error POST /marketing/campanas:", JSON.stringify(error));
    return c.json({ ok: false, error: `Error creando campaña: ${errMsg(error)}` }, 500);
  }
});

/* PUT /marketing/campanas/:id */
marketing.put("/campanas/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const id = c.req.param("id");
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("marketing_campanas")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return c.json({ ok: true, data });
  } catch (error) {
    console.log(`Error PUT /marketing/campanas/${id}:`, JSON.stringify(error));
    return c.json({ ok: false, error: `Error actualizando campaña: ${errMsg(error)}` }, 500);
  }
});

/* DELETE /marketing/campanas/:id */
marketing.delete("/campanas/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const id = c.req.param("id");

    const { error } = await supabase
      .from("marketing_campanas")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return c.json({ ok: true });
  } catch (error) {
    console.log(`Error DELETE /marketing/campanas/${id}:`, JSON.stringify(error));
    return c.json({ ok: false, error: `Error eliminando campaña: ${errMsg(error)}` }, 500);
  }
});

// ── SUSCRIPTORES ─────────────────────────────────────

/* GET /marketing/suscriptores */
marketing.get("/suscriptores", async (c) => {
  try {
    const supabase = getSupabase();
    const estado = c.req.query("estado");

    let query = supabase
      .from("marketing_suscriptores")
      .select("*")
      .order("created_at", { ascending: false });

    if (estado) query = query.eq("estado", estado);

    const { data, error } = await query;
    if (error) throw error;
    return c.json({ ok: true, data: data ?? [] });
  } catch (error) {
    console.log("Error GET /marketing/suscriptores:", JSON.stringify(error));
    return c.json({ ok: false, error: `Error listando suscriptores: ${errMsg(error)}` }, 500);
  }
});

/* POST /marketing/suscriptores */
marketing.post("/suscriptores", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    if (!body.email) {
      return c.json({ ok: false, error: "email es requerido" }, 400);
    }

    const payload = {
      email: body.email.trim().toLowerCase(),
      nombre: body.nombre ?? null,
      estado: body.estado ?? "activo",
      tags: body.tags ?? [],
      fuente: body.fuente ?? null,
    };

    const { data, error } = await supabase
      .from("marketing_suscriptores")
      .upsert(payload, { onConflict: "email" })
      .select()
      .single();

    if (error) throw error;
    return c.json({ ok: true, data }, 201);
  } catch (error) {
    console.log("Error POST /marketing/suscriptores:", JSON.stringify(error));
    return c.json({ ok: false, error: `Error creando suscriptor: ${errMsg(error)}` }, 500);
  }
});

/* PUT /marketing/suscriptores/:id */
marketing.put("/suscriptores/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const id = c.req.param("id");
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("marketing_suscriptores")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return c.json({ ok: true, data });
  } catch (error) {
    console.log(`Error PUT /marketing/suscriptores/${id}:`, JSON.stringify(error));
    return c.json({ ok: false, error: `Error actualizando suscriptor: ${errMsg(error)}` }, 500);
  }
});

/* DELETE /marketing/suscriptores/:id */
marketing.delete("/suscriptores/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const id = c.req.param("id");

    const { error } = await supabase
      .from("marketing_suscriptores")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return c.json({ ok: true });
  } catch (error) {
    console.log(`Error DELETE /marketing/suscriptores/${id}:`, JSON.stringify(error));
    return c.json({ ok: false, error: `Error eliminando suscriptor: ${errMsg(error)}` }, 500);
  }
});

// ── FIDELIZACIÓN ──────────────────────────────────────

/* GET /marketing/fidelizacion/miembros */
marketing.get("/fidelizacion/miembros", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("fidelizacion_miembros")
      .select(`
        *,
        nivel:fidelizacion_niveles(*)
      `)
      .order("puntos_actuales", { ascending: false });

    if (error) throw error;
    return c.json({ ok: true, data: data ?? [] });
  } catch (error) {
    console.log("Error GET /marketing/fidelizacion/miembros:", JSON.stringify(error));
    return c.json({ ok: false, error: `Error listando miembros: ${errMsg(error)}` }, 500);
  }
});

/* GET /marketing/fidelizacion/miembros/:id */
marketing.get("/fidelizacion/miembros/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const id = c.req.param("id");

    const { data: miembro, error: miembroError } = await supabase
      .from("fidelizacion_miembros")
      .select(`
        *,
        nivel:fidelizacion_niveles(*)
      `)
      .eq("id", id)
      .single();

    if (miembroError) throw miembroError;

    const { data: movimientos, error: movError } = await supabase
      .from("fidelizacion_movimientos")
      .select("*")
      .eq("miembro_id", id)
      .order("created_at", { ascending: false });

    if (movError) throw movError;

    return c.json({
      ok: true,
      data: {
        ...miembro,
        movimientos: movimientos ?? [],
      },
    });
  } catch (error) {
    console.log(`Error GET /marketing/fidelizacion/miembros/${id}:`, JSON.stringify(error));
    return c.json({ ok: false, error: `Error obteniendo miembro: ${errMsg(error)}` }, 500);
  }
});

/* POST /marketing/fidelizacion/miembros */
marketing.post("/fidelizacion/miembros", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    if (!body.email) {
      return c.json({ ok: false, error: "email es requerido" }, 400);
    }

    // Get lowest level (Bronce) as default
    const { data: nivelBronce } = await supabase
      .from("fidelizacion_niveles")
      .select("id")
      .eq("puntos_minimos", 0)
      .single();

    const payload = {
      persona_id: body.persona_id ?? null,
      email: body.email.trim().toLowerCase(),
      nombre: body.nombre ?? null,
      nivel_id: body.nivel_id ?? nivelBronce?.id ?? null,
      puntos_actuales: body.puntos_actuales ?? 0,
      puntos_historicos: body.puntos_historicos ?? 0,
      estado: body.estado ?? "activo",
    };

    const { data, error } = await supabase
      .from("fidelizacion_miembros")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return c.json({ ok: true, data }, 201);
  } catch (error) {
    console.log("Error POST /marketing/fidelizacion/miembros:", JSON.stringify(error));
    return c.json({ ok: false, error: `Error creando miembro: ${errMsg(error)}` }, 500);
  }
});

/* PUT /marketing/fidelizacion/miembros/:id */
marketing.put("/fidelizacion/miembros/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const id = c.req.param("id");
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("fidelizacion_miembros")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return c.json({ ok: true, data });
  } catch (error) {
    console.log(`Error PUT /marketing/fidelizacion/miembros/${id}:`, JSON.stringify(error));
    return c.json({ ok: false, error: `Error actualizando miembro: ${errMsg(error)}` }, 500);
  }
});

/* POST /marketing/fidelizacion/miembros/:id/puntos */
marketing.post("/fidelizacion/miembros/:id/puntos", async (c) => {
  try {
    const supabase = getSupabase();
    const id = c.req.param("id");
    const body = await c.req.json();

    if (typeof body.puntos !== "number") {
      return c.json({ ok: false, error: "puntos debe ser un número" }, 400);
    }

    // Get current member
    const { data: miembro, error: miembroError } = await supabase
      .from("fidelizacion_miembros")
      .select("*")
      .eq("id", id)
      .single();

    if (miembroError) throw miembroError;

    const nuevoPuntos = miembro.puntos_actuales + body.puntos;
    const nuevoHistoricos = body.puntos > 0
      ? miembro.puntos_historicos + body.puntos
      : miembro.puntos_historicos;

    // Update member points
    const { data: updated, error: updateError } = await supabase
      .from("fidelizacion_miembros")
      .update({
        puntos_actuales: Math.max(0, nuevoPuntos),
        puntos_historicos: nuevoHistoricos,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Create movement record
    const { error: movError } = await supabase
      .from("fidelizacion_movimientos")
      .insert({
        miembro_id: id,
        tipo: body.puntos > 0 ? "suma" : "resta",
        puntos: Math.abs(body.puntos),
        descripcion: body.descripcion ?? null,
        referencia_id: body.referencia_id ?? null,
      });

    if (movError) throw movError;

    // Auto-update level based on points
    const { data: niveles } = await supabase
      .from("fidelizacion_niveles")
      .select("*")
      .order("puntos_minimos", { ascending: false });

    if (niveles) {
      const nivelAdecuado = niveles.find(n => Math.max(0, nuevoPuntos) >= n.puntos_minimos);
      if (nivelAdecuado && nivelAdecuado.id !== updated.nivel_id) {
        await supabase
          .from("fidelizacion_miembros")
          .update({ nivel_id: nivelAdecuado.id })
          .eq("id", id);
      }
    }

    return c.json({ ok: true, data: updated });
  } catch (error) {
    console.log(`Error POST /marketing/fidelizacion/miembros/${id}/puntos:`, JSON.stringify(error));
    return c.json({ ok: false, error: `Error actualizando puntos: ${errMsg(error)}` }, 500);
  }
});

/* GET /marketing/fidelizacion/niveles */
marketing.get("/fidelizacion/niveles", async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("fidelizacion_niveles")
      .select("*")
      .order("puntos_minimos", { ascending: true });

    if (error) throw error;
    return c.json({ ok: true, data: data ?? [] });
  } catch (error) {
    console.log("Error GET /marketing/fidelizacion/niveles:", JSON.stringify(error));
    return c.json({ ok: false, error: `Error listando niveles: ${errMsg(error)}` }, 500);
  }
});

// ── SORTEOS ───────────────────────────────────────────

/* GET /marketing/sorteos */
marketing.get("/sorteos", async (c) => {
  try {
    const supabase = getSupabase();
    const estado = c.req.query("estado");

    let query = supabase
      .from("sorteos")
      .select("*")
      .order("created_at", { ascending: false });

    if (estado) query = query.eq("estado", estado);

    const { data, error } = await query;
    if (error) throw error;
    return c.json({ ok: true, data: data ?? [] });
  } catch (error) {
    console.log("Error GET /marketing/sorteos:", JSON.stringify(error));
    return c.json({ ok: false, error: `Error listando sorteos: ${errMsg(error)}` }, 500);
  }
});

/* POST /marketing/sorteos */
marketing.post("/sorteos", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    if (!body.nombre) {
      return c.json({ ok: false, error: "nombre es requerido" }, 400);
    }

    const payload = {
      nombre: body.nombre,
      descripcion: body.descripcion ?? null,
      premio: body.premio ?? null,
      estado: body.estado ?? "borrador",
      inicio: body.inicio ?? null,
      fin: body.fin ?? null,
    };

    const { data, error } = await supabase
      .from("sorteos")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return c.json({ ok: true, data }, 201);
  } catch (error) {
    console.log("Error POST /marketing/sorteos:", JSON.stringify(error));
    return c.json({ ok: false, error: `Error creando sorteo: ${errMsg(error)}` }, 500);
  }
});

/* PUT /marketing/sorteos/:id */
marketing.put("/sorteos/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const id = c.req.param("id");
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("sorteos")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return c.json({ ok: true, data });
  } catch (error) {
    console.log(`Error PUT /marketing/sorteos/${id}:`, JSON.stringify(error));
    return c.json({ ok: false, error: `Error actualizando sorteo: ${errMsg(error)}` }, 500);
  }
});

/* POST /marketing/sorteos/:id/participar */
marketing.post("/sorteos/:id/participar", async (c) => {
  try {
    const supabase = getSupabase();
    const id = c.req.param("id");
    const body = await c.req.json();

    if (!body.email) {
      return c.json({ ok: false, error: "email es requerido" }, 400);
    }

    // Check if sorteo exists and is active
    const { data: sorteo, error: sorteoError } = await supabase
      .from("sorteos")
      .select("*")
      .eq("id", id)
      .single();

    if (sorteoError) throw sorteoError;

    if (sorteo.estado !== "activo") {
      return c.json({ ok: false, error: "El sorteo no está activo" }, 400);
    }

    // Check if already participated
    const { data: existing } = await supabase
      .from("sorteos_participantes")
      .select("id")
      .eq("sorteo_id", id)
      .eq("email", body.email.trim().toLowerCase())
      .maybeSingle();

    if (existing) {
      return c.json({ ok: false, error: "Ya participaste en este sorteo" }, 400);
    }

    // Add participant
    const { data: participante, error: partError } = await supabase
      .from("sorteos_participantes")
      .insert({
        sorteo_id: id,
        email: body.email.trim().toLowerCase(),
        nombre: body.nombre ?? null,
      })
      .select()
      .single();

    if (partError) throw partError;

    // Update total participants
    const { error: updateError } = await supabase
      .from("sorteos")
      .update({ total_participantes: sorteo.total_participantes + 1 })
      .eq("id", id);

    if (updateError) throw updateError;

    return c.json({ ok: true, data: participante }, 201);
  } catch (error) {
    console.log(`Error POST /marketing/sorteos/${id}/participar:`, JSON.stringify(error));
    return c.json({ ok: false, error: `Error registrando participación: ${errMsg(error)}` }, 500);
  }
});

/* POST /marketing/sorteos/:id/girar */
marketing.post("/sorteos/:id/girar", async (c) => {
  try {
    const supabase = getSupabase();
    const id = c.req.param("id");

    // Get all participants
    const { data: participantes, error: partError } = await supabase
      .from("sorteos_participantes")
      .select("*")
      .eq("sorteo_id", id);

    if (partError) throw partError;

    if (!participantes || participantes.length === 0) {
      return c.json({ ok: false, error: "No hay participantes en este sorteo" }, 400);
    }

    // Select random winner
    const ganador = participantes[Math.floor(Math.random() * participantes.length)];

    // Update sorteo
    const { data: sorteo, error: updateError } = await supabase
      .from("sorteos")
      .update({
        estado: "finalizado",
        ganador_id: ganador.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    return c.json({ ok: true, data: { ganador, sorteo } });
  } catch (error) {
    console.log(`Error POST /marketing/sorteos/${id}/girar:`, JSON.stringify(error));
    return c.json({ ok: false, error: `Error girando sorteo: ${errMsg(error)}` }, 500);
  }
});
