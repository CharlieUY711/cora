/**
 * Roadmap — módulos + archivos adjuntos por módulo
 * Bucket: module-files
 * Persistencia: SQL (roadmap_modules, roadmap_tasks, roadmap_historial, ideas_promovidas)
 * KV keys (solo para archivos):
 *   module-files:{moduleId}    → array de ModuleFileEntry
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";
import { MODULES_DATA, MODULES_DATA_MAP } from "./modulesData.ts";

const roadmap = new Hono();

roadmap.use('/*', cors({
  origin: [
    'https://app.oddy.com.uy', 
    'https://web.oddy.com.uy',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'apikey', 'x-client-info'],
  maxAge: 86400,
}));

const BUCKET = "module-files";

const getSupabase = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

/* ── Inicializar bucket al arrancar ─────────────────── */
(async () => {
  try {
    const supabase = getSupabase();
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b: any) => b.name === BUCKET);
    if (!exists) {
      await supabase.storage.createBucket(BUCKET, { public: false });
      console.log(`[roadmap] Bucket ${BUCKET} creado`);
    }
  } catch (err) {
    console.log(`[roadmap] Error inicializando bucket: ${err}`);
  }
})();

/* =====================================================
   MÓDULOS — estado del roadmap (SQL)
===================================================== */

/** GET /modules — carga todos los estados desde SQL y combina con datos base */
roadmap.get("/modules", async (c) => {
  try {
    const supabase = getSupabase();
    const { data: sqlData, error } = await supabase
      .from("roadmap_modules")
      .select("*")
      .order("exec_order", { ascending: true, nullsFirst: false });
    
    if (error) throw error;
    
    // Crear mapa de estado desde SQL (id → estado)
    const stateMap = new Map<string, any>();
    (sqlData ?? []).forEach((row: any) => {
      stateMap.set(row.id, {
        status: row.status,
        priority: row.priority,
        execOrder: row.exec_order,
        estimatedHours: row.estimated_hours,
        notas: row.notas,
        tiene_view: row.tiene_view,
        tiene_backend: row.tiene_backend,
        endpoint_ok: row.endpoint_ok,
        tiene_datos: row.tiene_datos,
        updated_at: row.updated_at,
      });
    });
    
    // Combinar datos base con estado de SQL
    // Si SQL está vacío, usar datos base con estados por defecto
    const modules = MODULES_DATA.map((base) => {
      const state = stateMap.get(base.id);
      
      // Si hay estado en SQL, combinar; si no, usar valores por defecto
      return {
        id: base.id,
        name: base.name,
        category: base.category,
        description: base.description,
        status: state?.status ?? "not-started",
        priority: state?.priority ?? "medium",
        execOrder: state?.execOrder ?? undefined,
        estimatedHours: state?.estimatedHours ?? base.estimatedHours ?? undefined,
        notas: state?.notas ?? undefined,
        submodules: base.submodules?.map(sub => ({
          id: sub.id,
          name: sub.name,
          status: state?.status ?? "not-started", // Los submódulos heredan el estado del padre por defecto
          estimatedHours: sub.estimatedHours,
        })),
        tiene_view: state?.tiene_view ?? false,
        tiene_backend: state?.tiene_backend ?? false,
        endpoint_ok: state?.endpoint_ok ?? false,
        tiene_datos: state?.tiene_datos ?? false,
        updated_at: state?.updated_at ?? undefined,
      };
    });
    
    return c.json({ modules, count: modules.length });
  } catch (err) {
    console.log(`[roadmap] GET /modules error: ${err}`);
    return c.json({ error: `Error cargando módulos: ${err}` }, 500);
  }
});

/** POST /modules-bulk — guarda todos los estados en SQL */
roadmap.post("/modules-bulk", async (c) => {
  try {
    const { modules } = await c.req.json();
    if (!Array.isArray(modules)) {
      return c.json({ error: "modules must be an array" }, 400);
    }

    const supabase = getSupabase();
    
    let updated = 0;
    for (const mod of modules) {
      const { data: existing } = await supabase
        .from("roadmap_modules")
        .select("status")
        .eq("id", mod.id)
        .single();
      
      const statusAnterior = existing?.status;
      const statusNuevo = mod.status;
      
      const row = {
        id: mod.id,
        status: mod.status,
        priority: mod.priority || "medium",
        exec_order: mod.execOrder ?? null,
        estimated_hours: mod.estimatedHours ?? null,
        notas: mod.notas || null,
        updated_at: new Date().toISOString(),
        updated_by: "system",
      };
      
      const { error: upsertErr } = await supabase
        .from("roadmap_modules")
        .upsert(row, { onConflict: "id" });
      
      if (upsertErr) {
        console.log(`[roadmap] Error upserting module ${mod.id}: ${upsertErr.message}`);
        continue;
      }
      
      if (statusAnterior && statusAnterior !== statusNuevo) {
        await supabase.from("roadmap_historial").insert({
          module_id: mod.id,
          status_anterior: statusAnterior,
          status_nuevo: statusNuevo,
          origen: "manual",
          notas: "Actualización masiva",
        });
      }
      
      updated++;
    }
    
    return c.json({ ok: true, updated });
  } catch (err) {
    console.log(`[roadmap] POST /modules-bulk error: ${err}`);
    return c.json({ error: `Error guardando módulos: ${err}` }, 500);
  }
});

/** POST /modules/:moduleId — guarda el estado de un módulo individual */
roadmap.post("/modules/:moduleId", async (c) => {
  try {
    const moduleId = c.req.param("moduleId");
    const updatedModule = await c.req.json();

    const supabase = getSupabase();
    
    const { data: existing } = await supabase
      .from("roadmap_modules")
      .select("status")
      .eq("id", moduleId)
      .single();
    
    const statusAnterior = existing?.status;
    const statusNuevo = updatedModule.status;
    
    const row = {
      id: moduleId,
      status: updatedModule.status,
      priority: updatedModule.priority || "medium",
      exec_order: updatedModule.execOrder ?? null,
      estimated_hours: updatedModule.estimatedHours ?? null,
      notas: updatedModule.notas || null,
      updated_at: new Date().toISOString(),
      updated_by: "system",
    };
    
    const { error: upsertErr } = await supabase
      .from("roadmap_modules")
      .upsert(row, { onConflict: "id" });
    
    if (upsertErr) throw upsertErr;
    
    if (statusAnterior && statusAnterior !== statusNuevo) {
      await supabase.from("roadmap_historial").insert({
        module_id: moduleId,
        status_anterior: statusAnterior,
        status_nuevo: statusNuevo,
        origen: "manual",
        notas: "Actualización individual",
      });
    }
    
    console.log(`[roadmap] POST /modules/${moduleId} — estado actualizado`);
    return c.json({ ok: true });
  } catch (err) {
    console.log(`[roadmap] POST /modules/:moduleId error: ${err}`);
    return c.json({ error: `Error actualizando módulo: ${err}` }, 500);
  }
});

/** DELETE /modules/reset — limpia todos los estados guardados */
roadmap.delete("/modules/reset", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("roadmap_modules")
      .delete()
      .neq("id", "");
    
    if (error) throw error;
    
    console.log("[roadmap] DELETE /modules/reset — SQL borrado");
    return c.json({ ok: true, message: "Estado del roadmap reseteado. El próximo load aplicará el manifest." });
  } catch (err) {
    console.log(`[roadmap] DELETE /modules/reset error: ${err}`);
    return c.json({ error: `Error reseteando: ${err}` }, 500);
  }
});

/* =====================================================
   ARCHIVOS — adjuntos por módulo
   Tipos: definicion | variables | otros
===================================================== */

/** GET /files/:moduleId — lista archivos + URLs firmadas (1h) */
roadmap.get("/files/:moduleId", async (c) => {
  try {
    const moduleId = c.req.param("moduleId");
    const files = ((await kv.get(`module-files:${moduleId}`)) ?? []) as any[];

    const supabase = getSupabase();
    const filesWithUrls = await Promise.all(
      files.map(async (f: any) => {
        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(f.path, 3600);
        return { ...f, url: data?.signedUrl ?? null };
      })
    );

    return c.json({ files: filesWithUrls });
  } catch (err) {
    console.log(`[roadmap] GET /files/:moduleId error: ${err}`);
    return c.json({ error: `Error cargando archivos: ${err}` }, 500);
  }
});

/** POST /files/upload — sube un archivo al bucket */
roadmap.post("/files/upload", async (c) => {
  try {
    const formData = await c.req.formData();
    const file     = formData.get("file")     as File   | null;
    const moduleId = formData.get("moduleId") as string | null;
    const fileType = formData.get("fileType") as string | null;

    if (!file || !moduleId || !fileType) {
      return c.json({ error: "Faltan campos requeridos: file, moduleId, fileType" }, 400);
    }

    const supabase = getSupabase();
    const fileId   = crypto.randomUUID();
    const parts    = file.name.split(".");
    const ext      = parts.length > 1 ? parts.pop()! : "bin";
    const safeName = parts.join(".").replace(/[^a-z0-9_\-]/gi, "_");
    const storagePath = `${moduleId}/${fileType}/${fileId}_${safeName}.${ext}`;

    const buffer = await file.arrayBuffer();
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: file.type || "application/octet-stream" });

    if (uploadErr) {
      console.log(`[roadmap] Storage upload error: ${uploadErr.message}`);
      return c.json({ error: `Error subiendo archivo: ${uploadErr.message}` }, 500);
    }

    const entry = {
      id:         fileId,
      moduleId,
      type:       fileType,
      name:       file.name,
      size:       file.size,
      path:       storagePath,
      uploadedAt: new Date().toISOString(),
    };

    const kvKey   = `module-files:${moduleId}`;
    const existing = ((await kv.get(kvKey)) ?? []) as any[];
    await kv.set(kvKey, [...existing, entry]);

    console.log(`[roadmap] Archivo subido: ${storagePath} (${file.size} bytes)`);
    return c.json({ ok: true, file: entry });
  } catch (err) {
    console.log(`[roadmap] POST /files/upload error: ${err}`);
    return c.json({ error: `Error en upload: ${err}` }, 500);
  }
});

/** DELETE /files/:moduleId/:fileId — elimina archivo de storage y KV */
roadmap.delete("/files/:moduleId/:fileId", async (c) => {
  try {
    const moduleId = c.req.param("moduleId");
    const fileId   = c.req.param("fileId");
    const kvKey    = `module-files:${moduleId}`;

    const files = ((await kv.get(kvKey)) ?? []) as any[];
    const file  = files.find((f: any) => f.id === fileId);

    if (!file) {
      return c.json({ error: "Archivo no encontrado" }, 404);
    }

    const supabase = getSupabase();
    const { error: delErr } = await supabase.storage
      .from(BUCKET)
      .remove([file.path]);

    if (delErr) {
      console.log(`[roadmap] Storage delete error: ${delErr.message}`);
    }

    await kv.set(kvKey, files.filter((f: any) => f.id !== fileId));
    return c.json({ ok: true });
  } catch (err) {
    console.log(`[roadmap] DELETE /files error: ${err}`);
    return c.json({ error: `Error eliminando archivo: ${err}` }, 500);
  }
});

/* =====================================================
   TASKS — tareas granulares por módulo/submódulo
===================================================== */

/** GET /tasks/:moduleId — lista tasks de un módulo */
roadmap.get("/tasks/:moduleId", async (c) => {
  try {
    const moduleId = c.req.param("moduleId");
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from("roadmap_tasks")
      .select("*")
      .eq("module_id", moduleId)
      .order("orden", { ascending: true });
    
    if (error) throw error;
    
    return c.json({ tasks: data ?? [] });
  } catch (err) {
    console.log(`[roadmap] GET /tasks/:moduleId error: ${err}`);
    return c.json({ error: `Error cargando tasks: ${err}` }, 500);
  }
});

/** POST /tasks — crear task */
roadmap.post("/tasks", async (c) => {
  try {
    const body = await c.req.json();
    const { module_id, submodule_id, nombre, status, responsable, fecha_estimada, blocker, notas, orden } = body;
    
    if (!module_id || !nombre) {
      return c.json({ error: "module_id y nombre son requeridos" }, 400);
    }
    
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("roadmap_tasks")
      .insert({
        module_id,
        submodule_id: submodule_id || null,
        nombre,
        status: status || "todo",
        responsable: responsable || null,
        fecha_estimada: fecha_estimada || null,
        blocker: blocker || null,
        notas: notas || null,
        orden: orden ?? 0,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return c.json({ task: data });
  } catch (err) {
    console.log(`[roadmap] POST /tasks error: ${err}`);
    return c.json({ error: `Error creando task: ${err}` }, 500);
  }
});

/** PUT /tasks/:taskId — actualizar task */
roadmap.put("/tasks/:taskId", async (c) => {
  try {
    const taskId = c.req.param("taskId");
    const body = await c.req.json();
    
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("roadmap_tasks")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .select()
      .single();
    
    if (error) throw error;
    
    return c.json({ task: data });
  } catch (err) {
    console.log(`[roadmap] PUT /tasks/:taskId error: ${err}`);
    return c.json({ error: `Error actualizando task: ${err}` }, 500);
  }
});

/** DELETE /tasks/:taskId — eliminar task */
roadmap.delete("/tasks/:taskId", async (c) => {
  try {
    const taskId = c.req.param("taskId");
    const supabase = getSupabase();
    
    const { error } = await supabase
      .from("roadmap_tasks")
      .delete()
      .eq("id", taskId);
    
    if (error) throw error;
    
    return c.json({ ok: true });
  } catch (err) {
    console.log(`[roadmap] DELETE /tasks/:taskId error: ${err}`);
    return c.json({ error: `Error eliminando task: ${err}` }, 500);
  }
});

/* =====================================================
   HISTORIAL — cambios de status
===================================================== */

/** GET /historial/:moduleId — historial de un módulo */
roadmap.get("/historial/:moduleId", async (c) => {
  try {
    const moduleId = c.req.param("moduleId");
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from("roadmap_historial")
      .select("*")
      .eq("module_id", moduleId)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    
    return c.json({ historial: data ?? [] });
  } catch (err) {
    console.log(`[roadmap] GET /historial/:moduleId error: ${err}`);
    return c.json({ error: `Error cargando historial: ${err}` }, 500);
  }
});

/** GET /historial — historial global (últimos 50) */
roadmap.get("/historial", async (c) => {
  try {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from("roadmap_historial")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    return c.json({ historial: data ?? [] });
  } catch (err) {
    console.log(`[roadmap] GET /historial error: ${err}`);
    return c.json({ error: `Error cargando historial: ${err}` }, 500);
  }
});

/* =====================================================
   AUDITORÍA — verificación automática de estado real
===================================================== */

/** POST /audit — ejecuta auditoría de un módulo */
roadmap.post("/audit", async (c) => {
  try {
    const { moduleId, endpointUrl, tableName, tiene_view, tiene_backend } = await c.req.json();
    
    if (!moduleId) {
      return c.json({ error: "moduleId es requerido" }, 400);
    }
    
    const supabase = getSupabase();
    
    // tiene_view y tiene_backend vienen del frontend (BUILT_MODULE_IDS, SUPABASE_MODULE_IDS)
    const tieneView = tiene_view ?? false;
    const tieneBackend = tiene_backend ?? false;
    
    let endpointOk = false;
    if (endpointUrl) {
      try {
        const fullUrl = endpointUrl.startsWith('http') 
          ? endpointUrl 
          : `https://${Deno.env.get("SUPABASE_URL")?.replace('https://', '')}${endpointUrl}`;
        const response = await fetch(fullUrl, {
          method: "GET",
          headers: { "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
          signal: AbortSignal.timeout(5000),
        });
        endpointOk = response.ok;
      } catch {
        endpointOk = false;
      }
    }
    
    let tieneDatos = false;
    if (tableName) {
      try {
        const { count } = await supabase
          .from(tableName)
          .select("id", { count: "exact", head: true });
        tieneDatos = (count ?? 0) > 0;
      } catch {
        tieneDatos = false;
      }
    }
    
    const { data: existing } = await supabase
      .from("roadmap_modules")
      .select("status, tiene_view, tiene_backend, endpoint_ok, tiene_datos")
      .eq("id", moduleId)
      .single();
    
    const statusAnterior = existing?.status;
    
    const { error: updateErr } = await supabase
      .from("roadmap_modules")
      .update({
        tiene_view: tieneView,
        tiene_backend: tieneBackend,
        endpoint_ok: endpointOk,
        tiene_datos: tieneDatos,
        auditado_at: new Date().toISOString(),
      })
      .eq("id", moduleId);
    
    if (updateErr) throw updateErr;
    
    // Calcular status automático según auditoría
    let statusNuevo = statusAnterior;
    if (tieneView && tieneBackend && endpointOk && tieneDatos) {
      statusNuevo = "completed";
    } else if (tieneView && tieneBackend && endpointOk) {
      statusNuevo = "progress-80";
    } else if (tieneView && tieneBackend) {
      statusNuevo = "ui-only";
    } else if (tieneView) {
      statusNuevo = "progress-50";
    }
    // Si no tiene view, mantener status manual (no forzar a not-started)
    
    if (statusNuevo !== statusAnterior && statusAnterior) {
      await supabase.from("roadmap_modules").update({ status: statusNuevo }).eq("id", moduleId);
      await supabase.from("roadmap_historial").insert({
        module_id: moduleId,
        status_anterior: statusAnterior,
        status_nuevo: statusNuevo,
        origen: "auditoria",
        notas: "Auditoría automática",
      });
    }
    
    return c.json({
      ok: true,
      tiene_view: tieneView,
      tiene_backend: tieneBackend,
      endpoint_ok: endpointOk,
      tiene_datos: tieneDatos,
      status: statusNuevo,
    });
  } catch (err) {
    console.log(`[roadmap] POST /audit error: ${err}`);
    return c.json({ error: `Error en auditoría: ${err}` }, 500);
  }
});

/** POST /audit/all — ejecuta auditoría de todos los módulos */
roadmap.post("/audit/all", async (c) => {
  try {
    const { modules } = await c.req.json();
    
    if (!Array.isArray(modules)) {
      return c.json({ error: "modules must be an array" }, 400);
    }
    
    const results = [];
    for (const mod of modules) {
      const auditRes = await fetch(`${c.req.url.replace("/all", "")}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mod),
      });
      const data = await auditRes.json();
      results.push({ moduleId: mod.moduleId, ...data });
    }
    
    return c.json({ ok: true, results });
  } catch (err) {
    console.log(`[roadmap] POST /audit/all error: ${err}`);
    return c.json({ error: `Error en auditoría masiva: ${err}` }, 500);
  }
});

/* =====================================================
   IDEAS PROMOVIDAS — puente Ideas Board → Roadmap
===================================================== */

/** GET /ideas-promovidas — lista ideas pendientes de aprobación */
roadmap.get("/ideas-promovidas", async (c) => {
  try {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from("ideas_promovidas")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    
    return c.json({ ideas: data ?? [] });
  } catch (err) {
    console.log(`[roadmap] GET /ideas-promovidas error: ${err}`);
    return c.json({ error: `Error cargando ideas: ${err}` }, 500);
  }
});

/** POST /ideas-promovidas — promover idea */
roadmap.post("/ideas-promovidas", async (c) => {
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
    console.log(`[roadmap] POST /ideas-promovidas error: ${err}`);
    return c.json({ error: `Error promoviendo idea: ${err}` }, 500);
  }
});

/** PUT /ideas-promovidas/:id — aprobar/rechazar/convertir a módulo */
roadmap.put("/ideas-promovidas/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const { estado, module_id, notas } = await c.req.json();
    
    if (!estado || !["aprobada", "rechazada", "convertida"].includes(estado)) {
      return c.json({ error: "estado debe ser: aprobada, rechazada o convertida" }, 400);
    }
    
    const supabase = getSupabase();
    
    const updateData: any = { estado, notas: notas || null };
    if (estado === "convertida" && module_id) {
      updateData.module_id = module_id;
    }
    
    const { data, error } = await supabase
      .from("ideas_promovidas")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    
    if (estado === "convertida" && module_id) {
      await supabase.from("roadmap_modules").upsert({
        id: module_id,
        status: "spec-ready",
        priority: "medium",
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
      
      await supabase.from("roadmap_historial").insert({
        module_id,
        status_anterior: null,
        status_nuevo: "spec-ready",
        origen: "promocion_idea",
        notas: `Convertido desde idea: ${data.idea_texto}`,
      });
    }
    
    return c.json({ idea: data });
  } catch (err) {
    console.log(`[roadmap] PUT /ideas-promovidas/:id error: ${err}`);
    return c.json({ error: `Error actualizando idea: ${err}` }, 500);
  }
});

export { roadmap };
