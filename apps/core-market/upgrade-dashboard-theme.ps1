# =========================
# 1. THEME GLOBAL
# =========================

$themePath = "src/styles/theme.css"

@"
:root {
  --color-bg-sidebar: #0A2540;
  --color-primary: #FF7A00;
  --color-primary-hover: #e96b00;
  --color-text-light: #ffffff;
  --color-bg-main: #f5f6f8;
}

/* Sidebar */
.sidebar {
  background-color: var(--color-bg-sidebar);
  color: var(--color-primary);
}

/* Active item */
.sidebar .active {
  background-color: rgba(255, 122, 0, 0.15);
  border-left: 4px solid var(--color-primary);
}

/* Buttons */
.btn-primary {
  background-color: var(--color-primary);
  color: white;
  border-radius: 8px;
  padding: 6px 12px;
}

.btn-primary:hover {
  background-color: var(--color-primary-hover);
}

/* Cards */
.card {
  background: white;
  border-radius: 12px;
  padding: 16px;
}

/* Inputs */
.input {
  border: 1px solid #ddd;
  padding: 8px;
  border-radius: 8px;
}
"@ | Set-Content $themePath


# =========================
# 2. HOOK DE PERMISOS
# =========================

$hookPath = "src/dashboard/hooks/usePermissions.ts"

@"
import { useUserRole } from "./useUserRole"

export function usePermissions() {
  const role = useUserRole()

  return {
    isAdmin: role === "admin",

    canEditCatalog: role === "admin",
    canDelete: role === "admin",
    canCreate: role === "admin",

    canViewAnalytics: role === "admin",

    canViewOrders: true,
  }
}
"@ | Set-Content $hookPath


# =========================
# 3. PATCH EN CATÁLOGO
# =========================

$catalogPath = "src/pages/admin/Catalogo.tsx"

if (Test-Path $catalogPath) {

$content = Get-Content $catalogPath -Raw

# importar permisos
if ($content -notmatch "usePermissions") {
    $content = $content -replace "import .*", "$&`nimport { usePermissions } from '../../dashboard/hooks/usePermissions'"
}

# insertar hook
$content = $content -replace "function Catalogo\(\)", "function Catalogo() { const { isAdmin, canEditCatalog } = usePermissions();"

# ocultar botón crear depto
$content = $content -replace "<button.*\+ Depto.*</button>", "{isAdmin && <button className='btn-primary'>+ Depto</button>}"

Set-Content $catalogPath $content

Write-Host "✔ Catalogo actualizado con permisos"
}

# =========================
# 4. SIDEBAR STYLE PATCH
# =========================

$sidebarPath = "src/dashboard/layout/Sidebar.tsx"

if (Test-Path $sidebarPath) {
$content = Get-Content $sidebarPath -Raw

$content = $content -replace "background:.*", "background: 'var(--color-bg-sidebar)',"
$content = $content -replace "color:.*", "color: 'var(--color-primary)',"

Set-Content $sidebarPath $content

Write-Host "✔ Sidebar actualizado"
}

# =========================
# DONE
# =========================

Write-Host ""
Write-Host "🚀 Dashboard actualizado:"
Write-Host "- Tema azul/naranja aplicado"
Write-Host "- Permisos por rol activos"
Write-Host "- UI unificada (admin/user)"
Write-Host ""
Write-Host "👉 Reiniciá el frontend: npm run dev"