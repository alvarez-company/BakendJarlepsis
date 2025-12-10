# Verificar Estado de MySQL Docker

Este documento explica cómo verificar si el servicio MySQL en el contenedor Docker está funcionando correctamente.

## 🔍 Método Rápido (Recomendado)

Ejecuta el script de verificación:

```bash
npm run check:mysql
```

Este script verifica automáticamente:
- ✅ Si el contenedor existe
- ✅ Si el contenedor está corriendo
- ✅ Estado del health check
- ✅ Si MySQL está respondiendo
- ✅ Si la base de datos existe
- ✅ Si el puerto está expuesto correctamente

## 📋 Métodos Manuales

### 1. Verificar Estado del Contenedor

```bash
docker ps -a | grep jarlepsis-mysql
```

**Estados posibles:**
- `Up` → Contenedor corriendo correctamente ✅
- `Restarting` → Contenedor con problemas, se reinicia constantemente ⚠️
- `Exited` → Contenedor detenido ❌
- No aparece → Contenedor no existe ❌

### 2. Verificar Health Check

```bash
docker inspect --format='{{.State.Health.Status}}' jarlepsis-mysql
```

**Estados posibles:**
- `healthy` → MySQL está funcionando correctamente ✅
- `starting` → MySQL se está iniciando, espera unos segundos ⏳
- `unhealthy` → MySQL tiene problemas ❌
- (vacío) → No hay health check configurado ⚠️

### 3. Verificar Conexión a MySQL

```bash
docker exec jarlepsis-mysql mysqladmin ping -h localhost -u root -proot
```

**Resultado esperado:**
```
mysqld is alive
```

Si muestra esto, MySQL está respondiendo correctamente ✅

### 4. Verificar Base de Datos

```bash
docker exec jarlepsis-mysql mysql -u root -proot -e "SHOW DATABASES;"
```

Deberías ver la base de datos `jarlepsisdev` en la lista.

### 5. Verificar Puerto Expuesto

```bash
docker port jarlepsis-mysql
```

**Resultado esperado:**
```
3306/tcp -> 0.0.0.0:3307
```

Esto significa que el puerto 3306 del contenedor está mapeado al puerto 3307 de tu máquina.

También puedes verificar si el puerto está escuchando:

```bash
lsof -i :3307
```

### 6. Ver Logs del Contenedor

```bash
npm run docker:db:logs
```

O directamente:

```bash
docker-compose logs mysql
docker-compose logs --tail=50 mysql  # Últimas 50 líneas
docker-compose logs -f mysql         # Seguir logs en tiempo real
```

## 🔧 Solución de Problemas

### Contenedor en Estado "Restarting"

Si el contenedor está en estado "Restarting", MySQL probablemente tiene un error de inicio.

**Solución:**
1. Ver logs para identificar el error:
   ```bash
   npm run docker:db:logs
   ```

2. Causas comunes:
   - Permisos incorrectos en volúmenes
   - Configuración de MySQL incorrecta
   - Puerto ya en uso
   - Error en archivos SQL de inicialización

3. Reiniciar el contenedor:
   ```bash
   npm run docker:db:stop
   npm run docker:db:start
   ```

4. Si persiste, reiniciar completamente (elimina datos):
   ```bash
   npm run docker:db:reset
   ```

### Contenedor No Existe

```bash
npm run docker:db:up
```

### Contenedor Detenido

```bash
npm run docker:db:start
```

### Health Check Unhealthy

1. Espera 30-60 segundos (MySQL tarda en iniciar)
2. Si persiste, revisa logs:
   ```bash
   npm run docker:db:logs
   ```

### MySQL No Responde

1. Verifica que el contenedor esté corriendo:
   ```bash
   docker ps | grep jarlepsis-mysql
   ```

2. Verifica logs:
   ```bash
   npm run docker:db:logs
   ```

3. Intenta conectarte manualmente:
   ```bash
   npm run docker:db:shell
   ```

### Puerto No Disponible

Si el puerto 3307 está ocupado:

1. Verifica qué proceso lo está usando:
   ```bash
   lsof -i :3307
   ```

2. Cambia el puerto en `docker-compose.yml`:
   ```yaml
   ports:
     - "3308:3306"  # Usa otro puerto
   ```

3. Actualiza `.env`:
   ```env
   DB_PORT=3308
   ```

4. Reinicia el contenedor:
   ```bash
   npm run docker:db:down
   npm run docker:db:up
   ```

## ✅ Checklist de Verificación

Usa este checklist para verificar que todo está funcionando:

- [ ] Contenedor existe (`docker ps -a | grep jarlepsis-mysql`)
- [ ] Contenedor está corriendo (`docker ps | grep jarlepsis-mysql`)
- [ ] Health check está en "healthy" (`docker inspect ...`)
- [ ] MySQL responde (`mysqladmin ping`)
- [ ] Base de datos existe (`SHOW DATABASES`)
- [ ] Puerto está expuesto (`docker port jarlepsis-mysql`)
- [ ] Puerto está escuchando (`lsof -i :3307`)
- [ ] Puedes conectarte desde tu aplicación

## 📝 Comandos Útiles

```bash
# Verificación rápida
npm run check:mysql

# Ver logs
npm run docker:db:logs

# Acceder a MySQL
npm run docker:db:shell

# Ver estado
docker ps -a | grep jarlepsis-mysql

# Reiniciar contenedor
npm run docker:db:stop
npm run docker:db:start

# Reiniciar completamente (elimina datos)
npm run docker:db:reset

# Verificar puertos
npm run check:ports
```

## 🎯 Ejemplo de Salida Correcta

Cuando MySQL está funcionando correctamente, deberías ver algo como:

```
🔍 Verificando estado del servicio MySQL en Docker...

1️⃣ Verificando si el contenedor existe...
✅ Contenedor jarlepsis-mysql encontrado

2️⃣ Verificando estado del contenedor...
   Estado: Up 5 minutes
✅ Contenedor está CORRIENDO

3️⃣ Verificando health check del contenedor...
✅ Health check: HEALTHY

4️⃣ Verificando conexión a MySQL...
✅ MySQL está respondiendo correctamente

5️⃣ Verificando base de datos...
✅ Base de datos 'jarlepsisdev' existe

6️⃣ Verificando puerto expuesto...
✅ Puerto expuesto: 3306/tcp -> 0.0.0.0:3307
✅ Puerto 3307 está escuchando

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RESUMEN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ MySQL Docker está FUNCIONANDO correctamente

🔗 Puedes conectarte desde tu aplicación con:
   Host: 127.0.0.1
   Puerto: 3307
   Usuario: root
   Contraseña: root
   Base de datos: jarlepsisdev
```

