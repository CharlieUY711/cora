// @core/auth/nextjs
export { createClient as createBrowserClient } from './supabase/client'
export { createClient as createServerClient }  from './supabase/server'
export { createCoreMiddleware, defaultMatcher } from './middleware'
export type { CoreAuthMiddlewareOptions }       from './middleware'
