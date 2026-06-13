import { createClient } from "npm:@supabase/supabase-js";
import type { Context } from "npm:hono";

export const getSupabase = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

export const getTenant = (c: Context): string =>
  c.req.header("x-tenant-id") ?? "oddy";

export const errMsg = (e: unknown): string => {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e !== null && "message" in e)
    return String((e as { message: unknown }).message);
  return JSON.stringify(e);
};

export const corsHeaders = {
  origin: [
    "https://app.oddy.com.uy",
    "https://web.oddy.com.uy",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
  ],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "apikey", "x-client-info", "x-tenant-id"],
  maxAge: 86400,
};
