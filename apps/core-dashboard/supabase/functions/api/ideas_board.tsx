/**
 * Ideas Board — Canvases de ideas y módulos
 * KV keys:
 *   ideas-board:canvases-index   → CanvasMeta[]
 *   ideas-board:canvas-{id}      → CanvasData (nodes + edges)
 *   ideas-board:ideas-index      → IdeaNote[]
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

const ideasBoard = new Hono();

const getSupabase = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

/* =============================================
   CANVASES
============================================= */

/** GET /canvases → lista todos los canvases */
ideasBoard.get("/canvases", async (c) => {
  try {
    const index = await kv.get("ideas-board:canvases-index");
    return c.json({ canvases: index ?? [] });
  } catch (err) {
    console.log(`[ideas-board] GET /canvases error: ${err}`);
    return c.json({ error: `Error cargando canvases: ${err}` }, 500);
  }
});

/** POST /canvases → crea nuevo canvas */
ideasBoard.post("/canvases", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const meta = {
      id,
      name: body.name ?? "Nuevo Canvas",
      parentId: body.parentId ?? null,
      createdAt: now,
    };
    const data = { ...meta, nodes: [], edges: [], updatedAt: now };

    const index: any[] = (await kv.get("ideas-board:canvases-index")) ?? [];
    index.push(meta);
    await kv.set("ideas-board:canvases-index", index);
    await kv.set(`ideas-board:canvas-${id}`, data);

    return c.json({ canvas: data });
  } catch (err) {
    console.log(`[ideas-board] POST /canvases error: ${err}`);
    return c.json({ error: `Error creando canvas: ${err}` }, 500);
  }
});

/** GET /canvases/:id → canvas con nodos y edges */
ideasBoard.get("/canvases/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await kv.get(`ideas-board:canvas-${id}`);
    if (!data) return c.json({ error: "Canvas no encontrado" }, 404);
    return c.json({ canvas: data });
  } catch (err) {
    console.log(`[ideas-board] GET /canvases/:id error: ${err}`);
    return c.json({ error: `Error cargando canvas: ${err}` }, 500);
  }
});

/** PUT /canvases/:id → actualiza canvas (nombre, parentId, nodos, edges) */
ideasBoard.put("/canvases/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing: any = await kv.get(`ideas-board:canvas-${id}`);
    if (!existing) return c.json({ error: "Canvas no encontrado" }, 404);

    const updated = { ...existing, ...body, id, updatedAt: new Date().toISOString() };
    await kv.set(`ideas-board:canvas-${id}`, updated);

    // Actualizar índice si cambiaron nombre o parentId
    if (body.name !== undefined || body.parentId !== undefined) {
      const index: any[] = (await kv.get("ideas-board:canvases-index")) ?? [];
      const idx = index.findIndex((c: any) => c.id === id);
      if (idx >= 0) {
        index[idx] = { ...index[idx], name: updated.name, parentId: updated.parentId };
        await kv.set("ideas-board:canvases-index", index);
      }
    }

    return c.json({ canvas: updated });
  } catch (err) {
    console.log(`[ideas-board] PUT /canvases/:id error: ${err}`);
    return c.json({ error: `Error actualizando canvas: ${err}` }, 500);
  }
});

/** DELETE /canvases/:id → elimina canvas */
ideasBoard.delete("/canvases/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`ideas-board:canvas-${id}`);
    const index: any[] = (await kv.get("ideas-board:canvases-index")) ?? [];
    await kv.set(
      "ideas-board:canvases-index",
      index.filter((c: any) => c.id !== id)
    );
    return c.json({ ok: true });
  } catch (err) {
    console.log(`[ideas-board] DELETE /canvases/:id error: ${err}`);
    return c.json({ error: `Error eliminando canvas: ${err}` }, 500);
  }
});

/* =============================================
   IDEAS
============================================= */

/** GET /ideas → lista ideas (opcional ?area=xxx) */
ideasBoard.get("/ideas", async (c) => {
  try {
    const area = c.req.query("area");
    const all: any[] = (await kv.get("ideas-board:ideas-index")) ?? [];
    const filtered = area ? all.filter((i: any) => i.area === area) : all;
    // Ordenar por timestamp desc
    filtered.sort((a: any, b: any) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return c.json({ ideas: filtered });
  } catch (err) {
    console.log(`[ideas-board] GET /ideas error: ${err}`);
    return c.json({ error: `Error cargando ideas: ${err}` }, 500);
  }
});

/** POST /ideas → crea idea (bidireccional: actualiza relatedIds de las ideas relacionadas) */
ideasBoard.post("/ideas", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const idea = {
      id,
      area: body.area ?? "General",
      text: body.text ?? "",
      timestamp: new Date().toISOString(),
      relatedIds: body.relatedIds ?? [],
    };

    const all: any[] = (await kv.get("ideas-board:ideas-index")) ?? [];

    // Relación bidireccional: agregar este id a las ideas relacionadas
    for (const relId of (body.relatedIds ?? [])) {
      const relIdea = all.find((i: any) => i.id === relId);
      if (relIdea && !relIdea.relatedIds.includes(id)) {
        relIdea.relatedIds = [...(relIdea.relatedIds ?? []), id];
      }
    }

    all.push(idea);
    await kv.set("ideas-board:ideas-index", all);

    return c.json({ idea });
  } catch (err) {
    console.log(`[ideas-board] POST /ideas error: ${err}`);
    return c.json({ error: `Error creando idea: ${err}` }, 500);
  }
});

/** PUT /ideas/:id → actualiza texto/relaciones de una idea */
ideasBoard.put("/ideas/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const all: any[] = (await kv.get("ideas-board:ideas-index")) ?? [];
    const idx = all.findIndex((i: any) => i.id === id);
    if (idx < 0) return c.json({ error: "Idea no encontrada" }, 404);

    const prev = all[idx];
    all[idx] = { ...prev, ...body, id };

    // Si cambiaron relatedIds, mantener bidireccionalidad
    if (body.relatedIds) {
      const added = body.relatedIds.filter((r: string) => !prev.relatedIds.includes(r));
      const removed = prev.relatedIds.filter((r: string) => !body.relatedIds.includes(r));
      for (const relId of added) {
        const rel = all.find((i: any) => i.id === relId);
        if (rel && !rel.relatedIds.includes(id)) rel.relatedIds = [...rel.relatedIds, id];
      }
      for (const relId of removed) {
        const rel = all.find((i: any) => i.id === relId);
        if (rel) rel.relatedIds = rel.relatedIds.filter((r: string) => r !== id);
      }
    }

    await kv.set("ideas-board:ideas-index", all);
    return c.json({ idea: all[idx] });
  } catch (err) {
    console.log(`[ideas-board] PUT /ideas/:id error: ${err}`);
    return c.json({ error: `Error actualizando idea: ${err}` }, 500);
  }
});

/* =============================================
   PROMOCIÓN A ROADMAP (alias)
============================================= */

/** POST /promote-to-roadmap → alias para promover idea al roadmap */
ideasBoard.post("/promote-to-roadmap", async (c) => {
  try {
    const { idea_id, idea_texto, idea_area, notas } = await c.req.json();
    
    if (!idea_id || !idea_texto) {
      return c.json({ error: "idea_id e idea_texto son requeridos" }, 400);
    }
    
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("ideas_promovidas")
      .insert({
        idea_id,
        idea_texto,
        idea_area: idea_area || null,
        notas: notas || null,
        estado: "pendiente",
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return c.json({ idea: data });
  } catch (err) {
    console.log(`[ideas-board] POST /promote-to-roadmap error: ${err}`);
    return c.json({ error: `Error promoviendo idea: ${err}` }, 500);
  }
});

export { ideasBoard };

