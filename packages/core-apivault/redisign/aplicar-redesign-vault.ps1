$src = "C:\CORE\temp\api-vault-redesign"
$pkg = "C:\CORE\packages\api-vault\src\components"
$ws  = "C:\CORE\apps\core-workspace\lib\api-vault"

Copy-Item "$src\ApiVaultPage.tsx" "$pkg\ApiVaultPage.tsx" -Force
Write-Host "OK    packages/api-vault" -ForegroundColor Green

# Fix local imports for workspace copy
$c = [System.IO.File]::ReadAllText("$src\ApiVaultPage.tsx", [System.Text.Encoding]::UTF8)
$c = $c.Replace("from '../hooks/useApiVault'",    "from './useApiVault'")
$c = $c.Replace("from '../services/apiVaultTypes'", "from './apiVaultTypes'")
$c = $c.Replace("from '../services/apiVaultService'", "from './apiVaultService'")
[System.IO.File]::WriteAllText("$ws\ApiVaultPage.tsx", $c, (New-Object System.Text.UTF8Encoding $false))
Write-Host "OK    core-workspace/lib/api-vault" -ForegroundColor Green

# Fix TS error
$f = "$ws\ApiVaultPage.tsx"
$c2 = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
$c2 = $c2.Replace("].filter(Boolean).map(([l, v]) => {", "].filter(Boolean).map((row) => { const [l, v] = row as [string, React.ReactNode]; return (")
[System.IO.File]::WriteAllText($f, $c2, (New-Object System.Text.UTF8Encoding $false))

cd C:\CORE
pnpm --filter @charlieuy711/api-vault run build

cd C:\CORE\apps\core-workspace
git add -A && git commit -m "redesign: api-vault core-market palette" && git push
Write-Host ""
Write-Host "Hecho." -ForegroundColor Green
