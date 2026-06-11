/**
 * supabase/functions/process-ml-queue/index.ts
 *
 * ACTUALIZADO: delega el procesamiento a ml-sync que ya maneja
 * el token desde el vault. No usa ML_ACCESS_TOKEN estático.
 *
 * Se puede llamar:
 *   - Desde un cron de Supabase (cada 5-15 min)
 *   - Manualmente desde el panel Admin → Sync → "Procesar cola"
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FUNCTIONS_URL = Deno.env.get("SUPABASE_URL")!.replace("https://", "https://") + "/functions/v1";

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Llamar a ml-sync con action=process_queue
    // (reutiliza toda la lógica de token y procesamiento)
    const res = await fetch(`${FUNCTIONS_URL}/ml-sync`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        // Usar service role key para llamadas inter-función
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ action: "process_queue" }),
    });

    const data = await res.json();

    console.log(`[process-ml-queue] Done. Procesados: ${data.processed}, Errores: ${data.errors}`);

    return new Response(JSON.stringify(data), {
      status:  res.status,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[process-ml-queue] Error fatal:", error);
    return new Response(JSON.stringify({ ok: false, error: "Error interno" }), {
      status:  500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
