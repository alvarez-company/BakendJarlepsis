# Docker - Base de Datos MySQL

Este proyecto utiliza Docker para ejecutar la base de datos MySQL de forma aislada y reproducible.

## Requisitos

- Docker Desktop (o Docker Engine + Docker Compose)
- Node.js instalado localmente (para ejecutar el backend fuera de Docker)

## Inicio Rápido

### 1. Iniciar la base de datos

```bash
npm run docker:db:up
```

Este comando iniciará el contenedor MySQL con:
- **Puerto**: 3307 (por defecto, para evitar conflictos con MySQL local)
- **Base de datos**: jarlepsisdev
- **Usuario**: root
- **Contraseña**: root (configurable en `.env`)

### 2. Configurar variables de entorno

Copia `env.example` a `.env` y ajusta los valores si es necesario:

```bash
cp env.example .env
```

Asegúrate de que las variables de base de datos apunten a `localhost`:

```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USERNAME=root
DB_PASSWORD=root
DB_NAME=jarlepsisdev
```

### 3. Ejecutar migraciones (si es necesario)

```bash
npm run migration:run
```

### 4. Poblar la base de datos

```bash
npm run seed:full
```

### 5. Iniciar el backend

```bash
npm run start:dev
```

## Comandos Disponibles

### Gestión de la Base de Datos Docker

```bash
# Iniciar la base de datos
npm run docker:db:up

# Detener la base de datos (mantiene los datos)
npm run docker:db:stop

# Iniciar la base de datos (si está detenida)
npm run docker:db:start

# Ver logs de la base de datos
npm run docker:db:logs

# Detener y eliminar contenedores (mantiene volúmenes)
npm run docker:db:down

# Detener, eliminar contenedores Y volúmenes (elimina todos los datos)
npm run docker:db:reset

# Acceder a la consola MySQL
npm run docker:db:shell
```

### Comandos Docker Compose directos

Si prefieres usar Docker Compose directamente:

```bash
# Iniciar en segundo plano
docker-compose up -d mysql

# Ver estado
docker-compose ps

# Ver logs
docker-compose logs -f mysql

# Detener
docker-compose stop mysql

# Detener y eliminar
docker-compose down

# Detener y eliminar todo (incluyendo volúmenes)
docker-compose down -v
```

## Estructura de Volúmenes

Los datos de MySQL se almacenan en un volumen Docker persistente llamado `jarlepsis_mysql_data`. Esto significa que:

- ✅ Los datos persisten aunque reinicies el contenedor
- ✅ Los datos persisten aunque elimines el contenedor (a menos que uses `down -v`)
- ⚠️ Para eliminar TODOS los datos, usa `docker-compose down -v`

## Scripts de Inicialización

Puedes colocar archivos `.sql` en `docker/mysql/init/` y se ejecutarán automáticamente cuando se cree la base de datos por primera vez.

Los scripts se ejecutan en orden alfabético, así que puedes nombrarlos como:
- `01-create-tables.sql`
- `02-insert-data.sql`
- etc.

## Resolución de Problemas

### El puerto 3307 está en uso

El proyecto ya está configurado para usar el puerto 3307 por defecto para evitar conflictos con MySQL local. Si necesitas cambiar a otro puerto:

1. Actualiza `docker-compose.yml`:
```yaml
ports:
  - "NUEVO_PUERTO:3306"  # Puerto externo:interno del contenedor
```

2. Actualiza `.env`:
```env
DB_PORT=NUEVO_PUERTO
```

### La base de datos no inicia

1. Verifica los logs:
   ```bash
   npm run docker:db:logs
   ```

2. Verifica que el puerto no esté en uso:
   ```bash
   lsof -i :3307
   # O usa el script incluido:
   npm run check:ports
   ```

3. Reinicia Docker Desktop

### Conectar desde herramientas externas

Puedes conectar a la base de datos usando cualquier cliente MySQL con:

- **Host**: localhost
- **Puerto**: 3307 (por defecto)
- **Usuario**: root
- **Contraseña**: root (o la que configuraste en `.env`)
- **Base de datos**: jarlepsisdev

Ejemplo con MySQL Workbench, DBeaver, o HeidiSQL.

## Backup y Restore

### Backup

```bash
docker exec jarlepsis-mysql mysqldump -u root -proot jarlepsisdev > backup.sql
```

### Restore

```bash
docker exec -i jarlepsis-mysql mysql -u root -proot jarlepsisdev < backup.sql
```

