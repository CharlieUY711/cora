import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";

const app = new Hono();
const BUCKET = "files";

const getSupabase = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

let bucketReady = false;
async function ensureBucket() {
  if (bucketReady) return;
  const supabase = getSupabase();
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: false });
    if (error) console.log(`Error creando bucket ${BUCKET}: ${error.message}`);
    else console.log(`Bucket ${BUCKET} creado`);
  }
  bucketReady = true;
}

// GET /files — lista archivos con signed URLs
app.get("/files", async (c) => {
  try {
    await ensureBucket();
    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list("uploads", { sortBy: { column: "created_at", order: "desc" }, limit: 200 });
    if (error) throw error;

    const files = await Promise.all(
      (data || []).map(async (f) => {
        const { data: su } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(`uploads/${f.name}`, 3600);
        return {
          id: f.id,
          name: f.name,
          size: f.metadata?.size ?? 0,
          mimeType: f.metadata?.mimetype ?? "",
          createdAt: f.created_at,
          signedUrl: su?.signedUrl ?? null,
          path: `uploads/${f.name}`,
        };
      })
    );
    return c.json({ files });
  } catch (err) {
    console.log(`Error listando archivos: ${err}`);
    return c.json({ error: `Error listando archivos: ${err}` }, 500);
  }
});

// POST /upload — sube un archivo
app.post("/upload", async (c) => {
  try {
    await ensureBucket();
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return c.json({ error: "No se recibió ningún archivo" }, 400);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `uploads/${Date.now()}_${safeName}`;

    const supabase = getSupabase();
    const arrayBuffer = await file.arrayBuffer();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, { contentType: file.type, upsert: false });
    if (error) throw error;

    const { data: su } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(data.path, 3600);

    return c.json({
      success: true,
      path: data.path,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      signedUrl: su?.signedUrl ?? null,
    });
  } catch (err) {
    console.log(`Error subiendo archivo: ${err}`);
    return c.json({ error: `Error subiendo archivo: ${err}` }, 500);
  }
});

// DELETE /file — elimina un archivo
app.delete("/file", async (c) => {
  try {
    const { path } = await c.req.json();
    if (!path) return c.json({ error: "Falta path" }, 400);
    const supabase = getSupabase();
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw error;
    return c.json({ success: true });
  } catch (err) {
    console.log(`Error eliminando archivo: ${err}`);
    return c.json({ error: `Error eliminando archivo: ${err}` }, 500);
  }
});

export { app as cargaMasiva };



