#!/bin/bash

# Script para verificar el estado del servicio MySQL en Docker

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CONTAINER_NAME="jarlepsis-mysql"

echo "🔍 Verificando estado del servicio MySQL en Docker..."
echo ""

# 1. Verificar si el contenedor existe
echo "1️⃣ Verificando si el contenedor existe..."
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${GREEN}✅ Contenedor ${CONTAINER_NAME} encontrado${NC}"
else
    echo -e "${RED}❌ Contenedor ${CONTAINER_NAME} NO existe${NC}"
    echo ""
    echo "💡 Para crearlo, ejecuta:"
    echo "   npm run docker:db:up"
    exit 1
fi
echo ""

# 2. Verificar estado del contenedor
echo "2️⃣ Verificando estado del contenedor..."
CONTAINER_STATUS=$(docker ps -a --filter "name=${CONTAINER_NAME}" --format "{{.Status}}")
echo "   Estado: ${CONTAINER_STATUS}"

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${GREEN}✅ Contenedor está CORRIENDO${NC}"
    CONTAINER_RUNNING=true
else
    echo -e "${YELLOW}⚠️  Contenedor NO está corriendo${NC}"
    CONTAINER_RUNNING=false
    echo ""
    echo "💡 Para iniciarlo, ejecuta:"
    echo "   npm run docker:db:start"
    echo ""
fi
echo ""

# 3. Verificar health check
if [ "$CONTAINER_RUNNING" = true ]; then
    echo "3️⃣ Verificando health check del contenedor..."
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' ${CONTAINER_NAME} 2>/dev/null || echo "no-healthcheck")
    
    if [ "$HEALTH" = "healthy" ]; then
        echo -e "${GREEN}✅ Health check: HEALTHY${NC}"
    elif [ "$HEALTH" = "starting" ]; then
        echo -e "${YELLOW}⏳ Health check: STARTING (esperando a que MySQL esté listo)${NC}"
    elif [ "$HEALTH" = "unhealthy" ]; then
        echo -e "${RED}❌ Health check: UNHEALTHY${NC}"
        echo "   Revisa los logs: npm run docker:db:logs"
    elif [ "$HEALTH" = "no-healthcheck" ]; then
        echo -e "${YELLOW}⚠️  No hay health check configurado${NC}"
    else
        echo -e "${YELLOW}⚠️  Estado del health check: ${HEALTH}${NC}"
    fi
    echo ""
fi

# 4. Verificar conexión a MySQL
if [ "$CONTAINER_RUNNING" = true ]; then
    echo "4️⃣ Verificando conexión a MySQL..."
    
    # Intentar conexión
    if docker exec ${CONTAINER_NAME} mysqladmin ping -h localhost -u root -proot --silent 2>/dev/null; then
        echo -e "${GREEN}✅ MySQL está respondiendo correctamente${NC}"
        MYSQL_RESPONDING=true
    else
        echo -e "${RED}❌ MySQL NO está respondiendo${NC}"
        MYSQL_RESPONDING=false
        echo ""
        echo "💡 Posibles causas:"
        echo "   - MySQL aún se está iniciando (espera unos segundos)"
        echo "   - Credenciales incorrectas"
        echo "   - Error en la configuración"
        echo ""
        echo "💡 Revisa los logs:"
        echo "   npm run docker:db:logs"
    fi
    echo ""
    
    # 5. Verificar si la base de datos existe
    if [ "$MYSQL_RESPONDING" = true ]; then
        echo "5️⃣ Verificando base de datos..."
        DB_EXISTS=$(docker exec ${CONTAINER_NAME} mysql -u root -proot -e "SHOW DATABASES LIKE 'jarlepsisdev';" 2>/dev/null | grep -q jarlepsisdev && echo "yes" || echo "no")
        
        if [ "$DB_EXISTS" = "yes" ]; then
            echo -e "${GREEN}✅ Base de datos 'jarlepsisdev' existe${NC}"
        else
            echo -e "${YELLOW}⚠️  Base de datos 'jarlepsisdev' NO existe${NC}"
            echo "   Se creará automáticamente en el primer inicio"
        fi
        echo ""
        
        # 6. Verificar puerto expuesto
        echo "6️⃣ Verificando puerto expuesto..."
        PORT_CHECK=$(docker port ${CONTAINER_NAME} 2>/dev/null | grep "3306/tcp" | head -1 || echo "")
        
        if [ -n "$PORT_CHECK" ]; then
            echo -e "${GREEN}✅ Puerto expuesto: ${PORT_CHECK}${NC}"
            
            # Extraer el puerto externo (último número después de los dos puntos)
            EXTERNAL_PORT=$(echo $PORT_CHECK | awk -F: '{print $NF}')
            if [ -n "$EXTERNAL_PORT" ] && lsof -i :${EXTERNAL_PORT} > /dev/null 2>&1; then
                echo -e "${GREEN}✅ Puerto ${EXTERNAL_PORT} está escuchando${NC}"
            elif [ -n "$EXTERNAL_PORT" ]; then
                echo -e "${YELLOW}⚠️  Puerto ${EXTERNAL_PORT} aún no está escuchando (puede tardar unos segundos)${NC}"
            fi
        else
            echo -e "${RED}❌ Puerto NO está expuesto${NC}"
        fi
        echo ""
    fi
fi

# 7. Resumen
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMEN:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$CONTAINER_RUNNING" = true ] && [ "$MYSQL_RESPONDING" = true ]; then
    echo -e "${GREEN}✅ MySQL Docker está FUNCIONANDO correctamente${NC}"
    echo ""
    echo "🔗 Puedes conectarte desde tu aplicación con:"
    echo "   Host: 127.0.0.1"
    echo "   Puerto: 3307"
    echo "   Usuario: root"
    echo "   Contraseña: root"
    echo "   Base de datos: jarlepsisdev"
    echo ""
    echo "💡 Comandos útiles:"
    echo "   - Ver logs: npm run docker:db:logs"
    echo "   - Acceder a MySQL: npm run docker:db:shell"
    echo "   - Detener: npm run docker:db:stop"
    exit 0
else
    echo -e "${RED}❌ MySQL Docker NO está funcionando correctamente${NC}"
    echo ""
    echo "💡 Soluciones sugeridas:"
    echo "   1. Revisa los logs: npm run docker:db:logs"
    echo "   2. Reinicia el contenedor: npm run docker:db:stop && npm run docker:db:start"
    echo "   3. Si persiste, reinicia completamente: npm run docker:db:reset"
    exit 1
fi

