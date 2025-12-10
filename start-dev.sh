#!/bin/bash

# Script para iniciar el backend en modo desarrollo
# Este script asegura que los logs se muestren en la terminal actual
# y aumenta el límite de archivos abiertos para evitar errores EMFILE

cd "$(dirname "$0")"

# Aumentar el límite de archivos abiertos (solo para esta sesión)
ulimit -n 4096 2>/dev/null || true

echo "🚀 Iniciando backend en modo desarrollo..."
echo "📁 Directorio: $(pwd)"
echo "📊 Límite de archivos abiertos: $(ulimit -n)"
echo ""

# Ejecutar el comando directamente (no en background)
npm run start:dev

