# integrar-carrito.ps1
# Integra @core/carrito en apps\core-market para deploy standalone.
# Ejecutar desde C:\CORE\
# powershell -ExecutionPolicy Bypass -File integrar-carrito.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ROOT   = "C:\CORE"
$PKG    = "$ROOT\packages\core-carrito"
$MARKET = "$ROOT\apps\core-market"

function OK($msg)   { Write-Host "  OK: $msg" -ForegroundColor Green }
function INFO($msg) { Write-Host "  >> $msg" -ForegroundColor Cyan }
function WARN($msg) { Write-Host "  WARN: $msg" -ForegroundColor Yellow }
function STEP($msg) { Write-Host "`n[ $msg ]" -ForegroundColor White }
function FAIL($msg) { Write-Host "`n  ERROR: $msg" -ForegroundColor Red; exit 1 }

# -- Verificaciones
STEP "Verificando prerequisitos"
if (-not (Test-Path $PKG))    { FAIL "No existe $PKG" }
if (-not (Test-Path $MARKET)) { FAIL "No existe $MARKET" }
if (-not (Test-Path "$PKG\src\CarritoModule.tsx")) { FAIL "No existe $PKG\src\CarritoModule.tsx" }
OK "Directorios verificados"

# =====================================================================
# PASO 1 - Backup de archivos que se van a modificar
# =====================================================================
STEP "Paso 1/5 - Backup"

$stamp  = Get-Date -Format "yyyyMMdd_HHmmss"
$bakDir = "$MARKET\.bak_carrito_$stamp"
New-Item -ItemType Directory -Force -Path $bakDir | Out-Null

$toBackup = @(
    "vite.config.ts",
    "tsconfig.json",
    "src\app\public\CarritoPage.tsx",
    "src\app\public\CheckoutPage.tsx"
)
foreach ($f in $toBackup) {
    $full = "$MARKET\$f"
    if (Test-Path $full) {
        $flat = $f -replace "\\", "__"
        Copy-Item $full "$bakDir\$flat" -Force
    }
}
OK "Backup en $bakDir"

# =====================================================================
# PASO 2 - Copiar el package dentro de core-market
#          Ruta: apps\core-market\src\modules\carrito\
#          Vite lo resuelve via alias, sin workspace ni npm publish.
# =====================================================================
STEP "Paso 2/5 - Copiando modulo a core-market\src\modules\carrito"

$dest = "$MARKET\src\modules\carrito"
New-Item -ItemType Directory -Force -Path "$dest\adapters" | Out-Null

Copy-Item "$PKG\src\CarritoModule.tsx"       "$dest\CarritoModule.tsx"       -Force
Copy-Item "$PKG\src\index.ts"                "$dest\index.ts"                -Force
Copy-Item "$PKG\src\adapters\gateways.ts"    "$dest\adapters\gateways.ts"    -Force
OK "3 archivos copiados a src\modules\carrito"

# =====================================================================
# PASO 3 - CarritoPage.tsx (wrapper fino)
# =====================================================================
STEP "Paso 3/5 - Actualizando CarritoPage.tsx"

$carritoPage = @'
// src/app/public/CarritoPage.tsx
import CarritoModule from '@core/carrito';

export default function CarritoPage() {
  return (
    <CarritoModule
      mode="page"
      apiUrl={import.meta.env.VITE_API_URL}
    />
  );
}
'@
Set-Content "$MARKET\src\app\public\CarritoPage.tsx" $carritoPage -Encoding UTF8
OK "CarritoPage.tsx actualizado"

# =====================================================================
# PASO 4 - CheckoutPage.tsx (redirect a /carrito)
# =====================================================================
STEP "Paso 4/5 - Actualizando CheckoutPage.tsx"

$checkoutPage = @'
// src/app/public/CheckoutPage.tsx
// El flujo de checkout ahora vive en CarritoModule (pasos 2 y 3).
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CheckoutPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/carrito', { replace: true });
  }, [navigate]);
  return null;
}
'@
Set-Content "$MARKET\src\app\public\CheckoutPage.tsx" $checkoutPage -Encoding UTF8
OK "CheckoutPage.tsx actualizado"

# =====================================================================
# PASO 5 - Parchear vite.config.ts con alias @core/carrito y @core-market
# =====================================================================
STEP "Paso 5/5 - Parcheando vite.config.ts"

$vitePath = "$MARKET\vite.config.ts"
$viteContent = Get-Content $vitePath -Raw

# Verificar si ya tiene el alias
if ($viteContent -match "@core/carrito") {
    OK "vite.config.ts ya tiene el alias @core/carrito - sin cambios"
} else {
    # Buscar el bloque alias existente e insertar despues del primer alias
    # Patron: busca '@': ... y agrega despues
    $aliasBlock = @"

      // @core/carrito - modulo de carrito embebido
      '@core/carrito': path.resolve(__dirname, './src/modules/carrito/index.ts'),

      // Alias interno que usa CarritoModule para importar APIs de core-market
      '@core-market': path.resolve(__dirname, './src'),
"@

    # Insertar despues de la linea que tiene resolve: {
    if ($viteContent -match "alias:\s*\{") {
        $viteContent = $viteContent -replace "(alias:\s*\{)", "`$1$aliasBlock"
        Set-Content $vitePath $viteContent -Encoding UTF8
        OK "vite.config.ts parcheado con alias @core/carrito y @core-market"
    } else {
        WARN "No encontre bloque alias en vite.config.ts - agrega manualmente:"
        Write-Host ""
        Write-Host "  En vite.config.ts, dentro de resolve: { alias: { ... } } agrega:" -ForegroundColor Yellow
        Write-Host "  '@core/carrito': path.resolve(__dirname, './src/modules/carrito/index.ts')," -ForegroundColor Yellow
        Write-Host "  '@core-market':  path.resolve(__dirname, './src')," -ForegroundColor Yellow
        Write-Host ""
    }
}

# =====================================================================
# Verificar tsconfig paths
# =====================================================================
$tscPath = "$MARKET\tsconfig.json"
$tscContent = Get-Content $tscPath -Raw
if ($tscContent -match "@core/carrito") {
    OK "tsconfig.json ya tiene los paths - sin cambios"
} else {
    WARN "Agrega estos paths en tsconfig.json dentro de compilerOptions.paths:"
    Write-Host '  "@core/carrito":  ["./src/modules/carrito/index.ts"],' -ForegroundColor Yellow
    Write-Host '  "@core-market/*": ["./src/*"]' -ForegroundColor Yellow
}

# =====================================================================
# RESUMEN
# =====================================================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Magenta
Write-Host "  @core/carrito integrado en core-market" -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Modulo copiado en:" -ForegroundColor DarkGray
Write-Host "  apps\core-market\src\modules\carrito\" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Backup en: $bakDir" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Probar dev:" -ForegroundColor White
Write-Host "  cd C:\CORE\apps\core-market && pnpm dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Deploy:" -ForegroundColor White
Write-Host "  git add . && git commit -m `"feat: @core/carrito integrado`" && git push" -ForegroundColor Yellow
Write-Host ""
