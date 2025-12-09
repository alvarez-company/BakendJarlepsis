#!/bin/bash

# Script para aumentar el límite de archivos abiertos en macOS
# Esto soluciona el error "EMFILE: too many open files"

echo "🔧 Configurando límite de archivos abiertos para macOS..."

# Verificar si ya existe la configuración
if [ -f ~/Library/LaunchAgents/limit.maxfiles.plist ]; then
    echo "⚠️  Ya existe una configuración. ¿Deseas sobrescribirla? (s/n)"
    read -r response
    if [[ ! "$response" =~ ^[Ss]$ ]]; then
        echo "❌ Operación cancelada."
        exit 1
    fi
fi

# Crear el directorio si no existe
mkdir -p ~/Library/LaunchAgents

# Crear el archivo de configuración de launchd
cat > ~/Library/LaunchAgents/limit.maxfiles.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>limit.maxfiles</string>
    <key>ProgramArguments</key>
    <array>
      <string>launchctl</string>
      <string>limit</string>
      <string>maxfiles</string>
      <string>65536</string>
      <string>200000</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>ServiceIPC</key>
    <false/>
  </dict>
</plist>
EOF

echo "✅ Archivo de configuración creado: ~/Library/LaunchAgents/limit.maxfiles.plist"

# Cargar la configuración
launchctl load -w ~/Library/LaunchAgents/limit.maxfiles.plist 2>/dev/null || true

# Aplicar el límite inmediatamente
launchctl limit maxfiles 65536 200000

echo "✅ Límite configurado:"
echo "   - Soft limit: 65536"
echo "   - Hard limit: 200000"
echo ""
echo "📝 Para aplicar los cambios, reinicia tu terminal o ejecuta:"
echo "   launchctl limit maxfiles 65536 200000"
echo ""
echo "🔄 Reiniciando terminal para aplicar cambios..."

