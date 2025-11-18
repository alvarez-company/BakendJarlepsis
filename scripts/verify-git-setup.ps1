# Script de verificación para GitFlow (PowerShell)
# Verifica que el repositorio esté correctamente configurado antes de hacer push

Write-Host "🔍 Verificando configuración de GitFlow..." -ForegroundColor Cyan
Write-Host ""

$ERRORS = 0

# 1. Verificar que estamos en un repositorio Git
if (-not (Test-Path .git)) {
    Write-Host "❌ Error: No estás en un repositorio Git" -ForegroundColor Red
    exit 1
}

# 2. Verificar que no hay archivos .env rastreados
Write-Host "📋 Verificando archivos sensibles..." -ForegroundColor Yellow
$envFiles = git ls-files | Select-String "\.env$"
if ($envFiles) {
    Write-Host "❌ Error: Se encontraron archivos .env en el repositorio" -ForegroundColor Red
    $envFiles | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
    $ERRORS++
} else {
    Write-Host "✅ No hay archivos .env rastreados" -ForegroundColor Green
}

# 3. Verificar que node_modules no está rastreado
$nodeModules = git ls-files | Select-String "node_modules"
if ($nodeModules) {
    Write-Host "❌ Error: node_modules está siendo rastreado" -ForegroundColor Red
    $ERRORS++
} else {
    Write-Host "✅ node_modules no está siendo rastreado" -ForegroundColor Green
}

# 4. Verificar que dist no está rastreado
$distFiles = git ls-files | Select-String "^dist/"
if ($distFiles) {
    Write-Host "❌ Error: dist/ está siendo rastreado" -ForegroundColor Red
    $ERRORS++
} else {
    Write-Host "✅ dist/ no está siendo rastreado" -ForegroundColor Green
}

# 5. Verificar que hay un .env.example
if (-not (Test-Path .env.example)) {
    Write-Host "⚠️  Advertencia: No se encontró .env.example" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env.example existe" -ForegroundColor Green
}

# 6. Verificar que hay un README.md
if (-not (Test-Path README.md)) {
    Write-Host "⚠️  Advertencia: No se encontró README.md" -ForegroundColor Yellow
} else {
    Write-Host "✅ README.md existe" -ForegroundColor Green
}

# 7. Verificar archivos grandes (>50MB)
Write-Host ""
Write-Host "📦 Verificando archivos grandes..." -ForegroundColor Yellow
$largeFiles = Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue | 
    Where-Object { $_.Length -gt 50MB -and $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*.git*" }
if ($largeFiles) {
    Write-Host "⚠️  Advertencia: Se encontraron archivos grandes (>50MB):" -ForegroundColor Yellow
    $largeFiles | ForEach-Object { Write-Host "   $($_.FullName) ($([math]::Round($_.Length / 1MB, 2)) MB)" -ForegroundColor Yellow }
} else {
    Write-Host "✅ No hay archivos grandes" -ForegroundColor Green
}

# 8. Verificar que estamos en una rama válida
Write-Host ""
$currentBranch = git branch --show-current
Write-Host "🌿 Rama actual: $currentBranch" -ForegroundColor Cyan

if ($currentBranch -eq "main" -or $currentBranch -eq "develop") {
    Write-Host "⚠️  Advertencia: Estás en una rama principal (main/develop)" -ForegroundColor Yellow
    Write-Host "   Considera trabajar en una rama feature/hotfix/release" -ForegroundColor Yellow
}

# 9. Verificar estado de Git
Write-Host ""
Write-Host "📊 Estado de Git:" -ForegroundColor Yellow
git status --short

# Resumen
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
if ($ERRORS -eq 0) {
    Write-Host "✅ Verificación completada sin errores" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Se encontraron $ERRORS error(es)" -ForegroundColor Red
    Write-Host "Por favor, corrige los errores antes de hacer push" -ForegroundColor Red
    exit 1
}

