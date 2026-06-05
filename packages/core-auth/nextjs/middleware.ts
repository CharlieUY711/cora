import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export interface CoreAuthMiddlewareOptions {
  // Rutas públicas que no requieren autenticación
  publicRoutes?: string[]
  // Ruta de login (default: '/login')
  loginRoute?: string
  // Ruta post-login (default: '/dashboard' o '/')
  defaultRedirect?: string
}

export function createCoreMiddleware(options: CoreAuthMiddlewareOptions = {}) {
  const {
    publicRoutes = ['/login'],
    loginRoute   = '/login',
    defaultRedirect = '/dashboard',
  } = options

  return async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const { pathname } = request.nextUrl
    const isPublic = publicRoutes.some(r => pathname.startsWith(r))

    // Ya autenticado intentando entrar al login → redirigir
    if (isPublic && user) {
      return NextResponse.redirect(new URL(defaultRedirect, request.url))
    }

    // Ruta protegida sin sesión → redirigir al login
    if (!isPublic && !user) {
      const url = new URL(loginRoute, request.url)
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }
}

// Matcher recomendado para todas las apps Next.js
export const defaultMatcher = [
  '/((?!_next/static|_next/image|favicon.ico|favicon.svg|logo.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
]
