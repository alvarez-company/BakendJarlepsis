# Docker - Backend Jarlepsis

Este documento explica cómo ejecutar el backend completo en Docker.

## Requisitos

- Docker Desktop (o Docker Engine + Docker Compose)
- Archivo `.env` configurado (puedes copiar `env.example`)

## Configuración Inicial

### 1. Crear archivo `.env`

Copia el archivo de ejemplo y ajusta los valores si es necesario:

```bash
cp env.example .env
```

### 2. Variables de Entorno Importantes

Para Docker, asegúrate de que estas variables estén configuradas en tu `.env`:

```env
NODE_ENV=production
PORT=4100
DB_HOST=mysql  # En Docker, usar el nombre del servicio
DB_PORT=3306   # Puerto interno del contenedor MySQL
DB_USERNAME=root
DB_PASSWORD=root
DB_NAME=jarlepsisdev
JWT_SECRET=tu-secret-key-aqui
JWT_EXPIRES_IN=24h
FRONTEND_URL=http://localhost:4173
MINIAPP_URL=http://localhost:4174
```

**Nota**: Cuando el backend corre en Docker, `DB_HOST` debe ser `mysql` (el nombre del servicio en docker-compose), no `localhost` o `127.0.0.1`.

## Comandos Disponibles

### Iniciar todos los servicios (MySQL + Backend)

```bash
docker-compose up -d
```

### Iniciar solo MySQL (para desarrollo local)

```bash
docker-compose up -d mysql
```

### Ver logs del backend

```bash
docker-compose logs -f backend
```

### Ver logs de MySQL

```bash
docker-compose logs -f mysql
```

### Ver logs de todos los servicios

```bash
docker-compose logs -f
```

### Detener todos los servicios

```bash
docker-compose down
```

### Detener y eliminar volúmenes (elimina todos los datos)

```bash
docker-compose down -v
```

### Reconstruir la imagen del backend

```bash
docker-compose build backend
docker-compose up -d backend
```

### Reconstruir sin caché

```bash
docker-compose build --no-cache backend
docker-compose up -d backend
```

## Estructura de Servicios

### MySQL
- **Puerto externo**: 3307 (configurable con `DB_PORT` en `.env`)
- **Puerto interno**: 3306
- **Usuario**: root
- **Contraseña**: root (configurable con `DB_PASSWORD` en `.env`)
- **Base de datos**: jarlepsisdev

### Backend
- **Puerto externo**: 4100 (configurable con `PORT` en `.env`)
- **Puerto interno**: 3000
- **Health check**: `http://localhost:4100/api/v1/health`
- **Swagger**: `http://localhost:4100/api/docs`

## Desarrollo vs Producción

### Desarrollo Local (Backend fuera de Docker)

Si prefieres ejecutar el backend localmente pero MySQL en Docker:

1. Inicia solo MySQL:
   ```bash
   docker-compose up -d mysql
   ```

2. Configura `.env` con:
   ```env
   DB_HOST=127.0.0.1
   DB_PORT=3307
   ```

3. Ejecuta el backend localmente:
   ```bash
   npm run start:dev
   ```

### Producción (Todo en Docker)

1. Configura `.env` con:
   ```env
   DB_HOST=mysql
   DB_PORT=3306
   ```

2. Inicia todos los servicios:
   ```bash
   docker-compose up -d
   ```

## Migraciones y Seeds

### Ejecutar migraciones

Si necesitas ejecutar migraciones, puedes hacerlo de dos formas:

**Opción 1: Desde el contenedor**
```bash
docker exec -it jarlepsis-backend npm run migration:run
```

**Opción 2: Desde tu máquina local** (si tienes acceso a la base de datos)
```bash
npm run migration:run
```

### Ejecutar seeds

```bash
docker exec -it jarlepsis-backend npm run seed:full
```

## Resolución de Problemas

### El backend no puede conectarse a MySQL

1. Verifica que MySQL esté corriendo:
   ```bash
   docker-compose ps
   ```

2. Verifica los logs de MySQL:
   ```bash
   docker-compose logs mysql
   ```

3. Verifica que `DB_HOST=mysql` en tu `.env`

4. Verifica la conectividad desde el contenedor:
   ```bash
   docker exec -it jarlepsis-backend ping mysql
   ```

### El puerto 4100 está en uso

Cambia el puerto en tu `.env`:
```env
PORT=4101
```

Y actualiza `docker-compose.yml`:
```yaml
ports:
  - "4101:3000"
```

### Reconstruir después de cambios en el código

```bash
docker-compose build backend
docker-compose up -d backend
```

### Ver el estado de los servicios

```bash
docker-compose ps
```

### Acceder a la consola del backend

```bash
docker exec -it jarlepsis-backend sh
```

### Acceder a la consola de MySQL

```bash
docker exec -it jarlepsis-mysql mysql -u root -proot jarlepsisdev
```

## Volúmenes

- **MySQL**: Los datos se almacenan en el volumen `jarlepsis_mysql_data`
- **Backend logs**: Los logs se montan desde `./logs` al contenedor

## Red

Todos los servicios están en la red `jarlepsis-network`, lo que les permite comunicarse entre sí usando los nombres de los servicios como hostnames.

