#!/bin/bash

# Script para verificar puertos disponibles

echo "🔍 Verificando puertos en tu sistema..."
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar un puerto específico
check_port() {
    local port=$1
    local service=$2
    
    if lsof -i :$port > /dev/null 2>&1; then
        echo -e "${RED}❌ Puerto $port ($service) está OCUPADO${NC}"
        echo "   Detalles:"
        lsof -i :$port | grep LISTEN | awk '{print "   - Proceso:", $1, "| PID:", $2}'
    else
        echo -e "${GREEN}✅ Puerto $port ($service) está DISPONIBLE${NC}"
    fi
    echo ""
}

# Verificar puertos comunes del proyecto
echo "=== Puertos del Proyecto Jarlepsis ==="
check_port 3306 "MySQL (Local - si existe)"
check_port 3307 "MySQL Docker (Jarlepsis)"
check_port 4100 "Backend (NestJS)"
check_port 4173 "Frontend (Vite)"

# Ver otros puertos comunes
echo "=== Otros Puertos Comunes ==="
check_port 3000 "Node.js (alternativo)"
check_port 5432 "PostgreSQL"
check_port 27017 "MongoDB"
check_port 6379 "Redis"

echo ""
echo "📋 Para ver TODOS los puertos ocupados, ejecuta:"
echo "   lsof -i -P | grep LISTEN"
echo ""
echo "📋 Para verificar un puerto específico:"
echo "   lsof -i :PUERTO"
echo ""
echo "📋 Para matar un proceso que usa un puerto:"
echo "   kill -9 \$(lsof -t -i :PUERTO)"

