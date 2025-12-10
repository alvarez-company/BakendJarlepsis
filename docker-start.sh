#!/bin/bash

# Script para iniciar el backend en Docker
# Este script ajusta automáticamente las variables de entorno para Docker

set -e

echo "🚀 Iniciando backend Jarlepsis en Docker..."

# Verificar que existe el archivo .env
if [ ! -f .env ]; then
    echo "❌ Error: No se encontró el archivo .env"
    echo "Por favor, copia env.example a .env y configura las variables:"
    echo "  cp env.example .env"
    exit 1
fi

# Crear backup del .env original si no existe
if [ ! -f .env.docker.backup ]; then
    echo "📋 Creando backup del .env original..."
    cp .env .env.docker.backup
fi

# Crear .env temporal para Docker
echo "⚙️  Configurando variables de entorno para Docker..."
cp .env .env.docker

# Ajustar DB_HOST para Docker
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' 's/DB_HOST=127\.0\.0\.1/DB_HOST=mysql/g' .env.docker
    sed -i '' 's/DB_PORT=3307/DB_PORT=3306/g' .env.docker
else
    # Linux
    sed -i 's/DB_HOST=127\.0\.0\.1/DB_HOST=mysql/g' .env.docker
    sed -i 's/DB_PORT=3307/DB_PORT=3306/g' .env.docker
fi

# Usar el .env.docker temporalmente
export $(cat .env.docker | grep -v '^#' | xargs)

echo "🐳 Construyendo y levantando contenedores..."
docker-compose up -d --build

echo ""
echo "✅ Servicios iniciados!"
echo ""
echo "📊 Estado de los servicios:"
docker-compose ps

echo ""
echo "📝 Logs del backend (Ctrl+C para salir):"
echo "   docker-compose logs -f backend"
echo ""
echo "📝 Logs de MySQL:"
echo "   docker-compose logs -f mysql"
echo ""
echo "🌐 Backend disponible en: http://localhost:${PORT:-4100}"
echo "📚 Swagger disponible en: http://localhost:${PORT:-4100}/api/docs"
echo "❤️  Health check: http://localhost:${PORT:-4100}/api/v1/health"
echo ""
echo "Para detener los servicios:"
echo "   docker-compose down"
echo ""
echo "Para ver los logs:"
echo "   docker-compose logs -f"

