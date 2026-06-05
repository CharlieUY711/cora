import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Para apps Vite las env vars usan VITE_ prefix
// Para apps Next.js usan NEXT_PUBLIC_ prefix
const url  = (import.meta as any)?.env?.VITE_SUPABASE_URL
         ?? process.env.NEXT_PUBLIC_SUPABASE_URL
         ?? ''
const key  = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY
         ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
         ?? ''

export const supabase = createSupabaseClient(url, key)

export function createClient() {
  return supabase
}
