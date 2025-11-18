#!/bin/bash

# Script de verificación para GitFlow
# Verifica que el repositorio esté correctamente configurado antes de hacer push

echo "🔍 Verificando configuración de GitFlow..."
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# 1. Verificar que estamos en un repositorio Git
if [ ! -d .git ]; then
    echo -e "${RED}❌ Error: No estás en un repositorio Git${NC}"
    exit 1
fi

# 2. Verificar que no hay archivos .env rastreados
echo "📋 Verificando archivos sensibles..."
if git ls-files | grep -q "\.env$"; then
    echo -e "${RED}❌ Error: Se encontraron archivos .env en el repositorio${NC}"
    git ls-files | grep "\.env$"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ No hay archivos .env rastreados${NC}"
fi

# 3. Verificar que node_modules no está rastreado
if git ls-files | grep -q "node_modules"; then
    echo -e "${RED}❌ Error: node_modules está siendo rastreado${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ node_modules no está siendo rastreado${NC}"
fi

# 4. Verificar que dist no está rastreado
if git ls-files | grep -q "^dist/"; then
    echo -e "${RED}❌ Error: dist/ está siendo rastreado${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ dist/ no está siendo rastreado${NC}"
fi

# 5. Verificar que hay un .env.example
if [ ! -f .env.example ]; then
    echo -e "${YELLOW}⚠️  Advertencia: No se encontró .env.example${NC}"
else
    echo -e "${GREEN}✅ .env.example existe${NC}"
fi

# 6. Verificar que hay un README.md
if [ ! -f README.md ]; then
    echo -e "${YELLOW}⚠️  Advertencia: No se encontró README.md${NC}"
else
    echo -e "${GREEN}✅ README.md existe${NC}"
fi

# 7. Verificar archivos grandes (>50MB)
echo ""
echo "📦 Verificando archivos grandes..."
LARGE_FILES=$(find . -type f -size +50M -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null)
if [ -n "$LARGE_FILES" ]; then
    echo -e "${YELLOW}⚠️  Advertencia: Se encontraron archivos grandes (>50MB):${NC}"
    echo "$LARGE_FILES"
else
    echo -e "${GREEN}✅ No hay archivos grandes${NC}"
fi

# 8. Verificar que estamos en una rama válida
CURRENT_BRANCH=$(git branch --show-current)
echo ""
echo "🌿 Rama actual: $CURRENT_BRANCH"

if [[ "$CURRENT_BRANCH" == "main" ]] || [[ "$CURRENT_BRANCH" == "develop" ]]; then
    echo -e "${YELLOW}⚠️  Advertencia: Estás en una rama principal (main/develop)${NC}"
    echo "   Considera trabajar en una rama feature/hotfix/release"
fi

# 9. Verificar estado de Git
echo ""
echo "📊 Estado de Git:"
git status --short

# Resumen
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Verificación completada sin errores${NC}"
    exit 0
else
    echo -e "${RED}❌ Se encontraron $ERRORS error(es)${NC}"
    echo "Por favor, corrige los errores antes de hacer push"
    exit 1
fi

