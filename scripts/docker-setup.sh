#!/bin/bash

# Script para configurar y iniciar la base de datos Docker

set -e

echo "🐳 Configurando base de datos Docker para Jarlepsis..."
echo ""

# Verificar si Docker está corriendo
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker no está corriendo. Por favor inicia Docker Desktop."
    exit 1
fi

# Verificar si existe .env
if [ ! -f .env ]; then
    echo "📝 Creando archivo .env desde env.example..."
    cp env.example .env
    echo "✅ Archivo .env creado. Por favor revisa y ajusta los valores si es necesario."
    echo ""
fi

# Iniciar la base de datos
echo "🚀 Iniciando contenedor MySQL..."
docker-compose up -d mysql

echo ""
echo "⏳ Esperando a que MySQL esté listo..."

# Esperar a que MySQL esté listo
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if docker exec jarlepsis-mysql mysqladmin ping -h localhost -u root -proot --silent 2>/dev/null; then
        echo "✅ MySQL está listo!"
        break
    fi
    attempt=$((attempt + 1))
    echo -n "."
    sleep 1
done

if [ $attempt -eq $max_attempts ]; then
    echo ""
    echo "❌ Error: MySQL no respondió a tiempo."
    echo "Verifica los logs con: npm run docker:db:logs"
    exit 1
fi

echo ""
echo "📊 Estado del contenedor:"
docker-compose ps

echo ""
echo "✅ Base de datos Docker configurada correctamente!"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Ejecutar migraciones: npm run migration:run"
echo "   2. Poblar la base de datos: npm run seed:full"
echo "   3. Iniciar el backend: npm run start:dev"
echo ""
echo "💡 Comandos útiles:"
echo "   - Ver logs: npm run docker:db:logs"
echo "   - Detener DB: npm run docker:db:stop"
echo "   - Reiniciar DB: npm run docker:db:start"
echo "   - Acceder a MySQL: npm run docker:db:shell"
echo ""

