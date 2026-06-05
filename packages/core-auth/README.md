# @core/auth

Auth único del ecosistema CORE.
Login, registro, verificación, recuperación y cambio de contraseña.
Soporta Next.js (App Router) y React/Vite.

---

## Estructura

```
packages/core-auth/
├── nextjs/                  ← Next.js App Router
│   ├── supabase/
│   │   ├── client.ts        ← createBrowserClient()
│   │   └── server.ts        ← createServerClient() — server components
│   ├── middleware.ts         ← createCoreMiddleware()
│   └── index.ts
├── react/                   ← React/Vite (core-market)
│   ├── supabase/client.ts   ← supabase singleton
│   ├── hooks/useAuth.ts     ← useAuth, useRequireAuth, useUserRole
│   └── index.ts
└── shared/                  ← Framework-agnostic
    ├── i18n.ts              ← traducciones ES/EN/PT
    ├── components/
    │   ├── AuthLayout.tsx   ← wrapper dark/light
    │   ├── LoginForm.tsx
    │   ├── RegisterForm.tsx
    │   └── AuthForms.tsx    ← ForgotPassword, ResetPassword, VerifyEmail
    └── index.ts
```

---

## Uso en Next.js (core-biblio, core-hub, core-fundation)

### middleware.ts
```ts
import { createCoreMiddleware, defaultMatcher } from '@core/auth/nextjs'

export const middleware = createCoreMiddleware({
  publicRoutes:    ['/login', '/register', '/forgot-password', '/reset-password', '/verify'],
  loginRoute:      '/login',
  defaultRedirect: '/dashboard',   // o '/aviso' para core-biblio
})

export const config = { matcher: defaultMatcher }
```

### Server component (verificar sesión)
```ts
import { createServerClient } from '@core/auth/nextjs'

export default async function Page() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  // ...
}
```

### Login page
```tsx
'use client'
import { AuthLayout, LoginForm } from '@core/auth/shared'
import { createBrowserClient } from '@core/auth/nextjs'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(email: string, password: string) {
    setLoading(true)
    const supabase = createBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Credenciales incorrectas.'); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <AuthLayout
      aesthetic="dark"
      productName="BIBLIOTECA"
      productByline="by CORE"
      productInitial="B"
      showLangSwitcher
    >
      <LoginForm
        aesthetic="dark"
        onSubmit={handleLogin}
        loading={loading}
        error={error}
      />
    </AuthLayout>
  )
}
```

---

## Uso en React/Vite (core-market)

### Reemplazar useRequireAuth existente
```ts
// Antes: import { useRequireAuth } from '../../hooks/useRequireAuth'
import { useRequireAuth } from '@core/auth/react'
```

### Reemplazar useUserRole existente
```ts
// Antes: import { useUserRole } from '../hooks/useUserRole'
import { useUserRole } from '@core/auth/react'
```

### LoginModal con estética light
```tsx
import { AuthLayout, LoginForm, RegisterForm } from '@core/auth/shared'
import { useAuth } from '@core/auth/react'
import { useState } from 'react'

export function LoginModal({ isOpen, onClose }) {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px', margin: '0 16px' }}>
        <AuthLayout aesthetic="light" productName="MARKET" productByline="by CORE" productInitial="M">
          {mode === 'login'
            ? <LoginForm aesthetic="light" onSubmit={async (e, p) => { setLoading(true); const { error } = await signIn(e, p); setError(error?.message ?? null); setLoading(false); if (!error) onClose() }} loading={loading} error={error} onRegister={() => setMode('register')} />
            : <RegisterForm aesthetic="light" onSubmit={async (e, p, n) => { setLoading(true); const { error } = await signUp(e, p, n); setLoading(false) }} loading={loading} error={error} onLogin={() => setMode('login')} />
          }
        </AuthLayout>
      </div>
    </div>
  )
}
```

---

## Variables de entorno

### Next.js (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

### Vite (.env)
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

---

v1.0 — 2026 | CORE
