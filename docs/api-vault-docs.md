# @charlieuy711/api-vault — Documentación Técnica

**Versión:** 1.0.0  
**Fecha:** Junio 2026  
**Ecosistema:** CORE monorepo (Turborepo + pnpm workspaces)

---

## Resumen

Módulo de gestión de tokens, API keys y credenciales de integración para el ecosistema CORE. Diseñado para ser instalado como paquete compartido en cualquier app del monorepo, con soporte multi-tenant y filtrado por app.

---

## Arquitectura

```
CORE/
├── packages/
│   └── api-vault/                  ← paquete compartido
│       ├── src/
│       │   ├── services/
│       │   │   ├── apiVaultTypes.ts     tipos, interfaces, constantes
│       │   │   └── apiVaultService.ts   CRUD + tenant helpers
│       │   ├── hooks/
│       │   │   └── useApiVault.ts       store Zustand
│       │   └── components/
│       │       └── ApiVaultPage.tsx     UI completa (React)
│       └── supabase/migrations/
│           └── 20260607_api_vault.sql
└── apps/
    ├── core-market/                ← integrado via paquete
    ├── core-workspace/             ← integrado via copia local
    └── ...otras apps
```

---

## Base de datos (Supabase)

### Tablas

#### `api_vault`
| Columna      | Tipo        | Descripción                              |
|-------------|-------------|------------------------------------------|
| id          | uuid PK     | Identificador único                      |
| user_id     | uuid FK     | Usuario creador (auth.users)             |
| tenant_id   | uuid FK     | Tenant al que pertenece (nullable)       |
| created_by  | uuid FK     | Usuario que creó el registro             |
| name        | text        | Nombre descriptivo                       |
| platform    | text        | Plataforma (OpenAI, Stripe, etc.)        |
| type        | text        | Tipo de credencial                       |
| value       | text        | Valor (almacenado en texto plano con RLS)|
| env         | text        | Entorno (production/staging/dev/testing) |
| tags        | text[]      | Etiquetas, incluye app_id para filtrado  |
| notes       | text        | Notas opcionales                         |
| expires_at  | timestamptz | Fecha de vencimiento (nullable)          |
| created_at  | timestamptz | Fecha de creación                        |
| updated_at  | timestamptz | Última actualización                     |

#### `tenants`
| Columna    | Tipo    | Descripción          |
|-----------|---------|----------------------|
| id        | uuid PK | Identificador único  |
| name      | text    | Nombre del tenant    |
| slug      | text    | Slug único           |
| created_at| timestamptz | Fecha de creación |

#### `tenant_members`
| Columna    | Tipo    | Descripción                        |
|-----------|---------|------------------------------------|
| id        | uuid PK | Identificador único                |
| tenant_id | uuid FK | Referencia a tenants               |
| user_id   | uuid FK | Referencia a auth.users            |
| role      | text    | owner / admin / member             |
| created_at| timestamptz | Fecha de creación              |

### Row Level Security (RLS)

Todas las tablas tienen RLS activo. La función helper `my_tenant_ids()` devuelve los tenant_ids del usuario autenticado.

**api_vault:** un usuario puede leer/escribir/eliminar registros que pertenezcan a alguno de sus tenants, o registros personales (sin tenant).

**tenants:** un usuario solo ve los tenants donde es miembro.

**tenant_members:** un usuario ve los miembros de sus tenants. Solo owner/admin pueden agregar o eliminar miembros.

---

## Tipos

### `VaultType`
```typescript
'api_key' | 'token' | 'oauth' | 'secret' | 'webhook' | 'connection' | 'jwt' | 'cert'
```

### `VaultEnv`
```typescript
'production' | 'staging' | 'development' | 'testing'
```

### `ApiVaultEntry`
```typescript
interface ApiVaultEntry {
  id:         string
  user_id:    string
  tenant_id:  string | null
  created_by: string | null
  name:       string
  platform:   string
  type:       VaultType
  value:      string
  env:        VaultEnv
  tags:       string[]
  notes:      string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}
```

### `Tenant`
```typescript
interface Tenant {
  id:   string
  name: string
  slug: string
  role: string  // rol del usuario actual en este tenant
}
```

---

## Servicio (`apiVaultService.ts`)

Todas las funciones reciben el cliente Supabase como primer parámetro para ser agnósticas al framework (Next.js, Vite, etc.).

```typescript
// Obtener entradas
fetchVaultEntries(supabase, options?: { tenantId?: string; appId?: string })

// Crear entrada
createVaultEntry(supabase, entry: ApiVaultInsert)

// Actualizar entrada
updateVaultEntry(supabase, id: string, updates: ApiVaultUpdate)

// Eliminar entrada
deleteVaultEntry(supabase, id: string)

// Obtener tenants del usuario
fetchMyTenants(supabase)

// Crear tenant (el usuario queda como owner)
createTenant(supabase, name: string, slug: string)

// Utilidades
isExpiringSoon(expiresAt: string | null, days?: number): boolean
isExpired(expiresAt: string | null): boolean
```

---

## Hook (`useApiVault`)

Store global con Zustand. Expone estado y acciones.

```typescript
const {
  // Estado
  entries,        // ApiVaultEntry[]
  tenants,        // Tenant[]
  activeTenant,   // Tenant | null
  loading,        // boolean
  error,          // string | null

  // Acciones vault
  load(supabase, options?),
  add(supabase, entry),
  edit(supabase, id, updates),
  remove(supabase, id),

  // Acciones tenant
  loadTenants(supabase),
  setTenant(tenant),
  addTenant(supabase, name, slug),

  // Selectores
  getByPlatform(platform),
  getExpiring(days?),
  getExpired(),
  stats(),  // { total, platforms, active, expiring }
} = useApiVault()
```

---

## Componente (`ApiVaultPage`)

Página completa con lista, búsqueda, filtros, formulario modal y panel de detalle.

```typescript
interface ApiVaultPageProps {
  supabase:   SupabaseClient
  tenantId?:  string   // filtra por tenant
  appId?:     string   // filtra por tag de app
  className?: string
}
```

### Ejemplos de uso

**Workspace — ve todas las credenciales del tenant:**
```tsx
import { ApiVaultPage } from '@charlieuy711/api-vault'
// o desde copia local:
import { ApiVaultPage } from '@/lib/api-vault/ApiVaultPage'

<ApiVaultPage supabase={supabase} tenantId={tenantId} />
```

**core-market — solo ve las keys etiquetadas para esa app:**
```tsx
<ApiVaultPage supabase={supabase} tenantId={tenantId} appId="core-market" />
```

**Uso del hook en cualquier componente para leer una key:**
```tsx
import { useApiVault } from '@charlieuy711/api-vault'

const { entries, load } = useApiVault()

useEffect(() => {
  load(supabase, { tenantId, appId: 'core-market' })
}, [])

const stripeKey = entries.find(
  e => e.platform === 'Stripe' && e.env === 'production'
)
```

---

## Integración en apps del monorepo

### Opción A — Paquete workspace (apps dentro del monorepo)
```json
// package.json de la app
{
  "dependencies": {
    "@charlieuy711/api-vault": "workspace:*"
  }
}
```

### Opción B — Copia local (apps con repo separado como core-workspace)
```
app/
└── lib/
    └── api-vault/
        ├── ApiVaultPage.tsx
        ├── apiVaultService.ts
        ├── apiVaultTypes.ts
        └── useApiVault.ts
```

---

## Habilitación por app (PortalConfig)

Cada app del ecosistema tiene un campo `features: Record<string, boolean>` en la tabla `portals`. Para habilitar el vault en una app, activar el toggle `api_vault` desde Workspace → Admin → Config de la app.

```typescript
const FEATURE_LABELS = {
  // ...otros features
  api_vault: 'API Vault (gestión de tokens)',
}
```

---

## Plataformas soportadas (80+)

Organizadas en 14 categorías:

| Categoría      | Ejemplos                                        |
|---------------|--------------------------------------------------|
| AI & ML       | OpenAI, Anthropic, Google AI, Hugging Face       |
| Pagos         | Stripe, PayPal, MercadoPago, Braintree           |
| Cloud         | AWS, Google Cloud, Azure, Cloudflare             |
| Base de datos | Supabase, Firebase, PlanetScale, MongoDB Atlas   |
| Deploy        | Vercel, Netlify, Railway, GitHub                 |
| Email & SMS   | SendGrid, Resend, Twilio, Mailgun                |
| Comunicación  | Slack, Discord, WhatsApp, Telegram               |
| Monitoring    | DataDog, Sentry, PostHog, Mixpanel               |
| CRM           | HubSpot, Salesforce, ActiveCampaign, Klaviyo     |
| Mapas         | Google Maps, Mapbox, HERE Maps                   |
| Auth          | Auth0, Clerk, Okta, Stytch                       |
| Storage       | Cloudinary, AWS S3, Uploadthing                  |
| eCommerce     | Shopify, WooCommerce, MercadoLibre               |
| Otro          | Campo libre                                      |

---

## Seguridad

- RLS activo en todas las tablas — Supabase filtra por `auth.uid()` automáticamente
- Los valores se almacenan en texto plano protegidos por RLS. Para cifrado adicional considerar pgcrypto o cifrado AES en cliente antes de guardar
- La UI enmascara los valores por defecto (`sk-••••••••1234`)
- La autenticación es via Bearer token JWT de Supabase — el mismo que usa el usuario en la app

---

## Pendientes / Roadmap

- Panel de gestión de tenants y miembros en Workspace
- Cifrado AES en cliente (Web Crypto API)
- Historial de rotación de keys
- Alertas automáticas por vencimiento (email/Slack)
- Exportación cifrada de credenciales
