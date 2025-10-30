# Script de Población de Datos - Colombia

Este script SQL contiene los datos de Colombia que necesitas para poblar las tablas del sistema.

## Contenido

### País
- **Colombia** (código: CO)

### Departamentos
32 departamentos de Colombia incluyendo:
- Santander (ID: 27)
- Norte de Santander (ID: 22)
- Y todos los demás departamentos

### Municipios
Solo se incluyen municipios de **Santander** y **Norte de Santander**:

**Santander** (87 municipios):
- Bucaramanga, Floridablanca, Girón, Piedecuesta
- San Gil, Socorro, Barbosa, Zapatoca
- Y muchos más...

**Norte de Santander** (40 municipios):
- Cúcuta, Pamplona, Ocaña, Los Patios
- Villa del Rosario, El Zulia, Tibú
- Y muchos más...

## Uso

### Opción 1: Ejecutar con MySQL CLI

```bash
# Conectarse a MySQL
mysql -u root -p inventario_db

# Ejecutar el script
source src/migrations/seed_colombia.sql
```

### Opción 2: Ejecutar con Docker

```bash
# Copiar el script al contenedor
docker cp backend/src/migrations/seed_colombia.sql inventario-mysql:/tmp/

# Ejecutar dentro del contenedor
docker exec -i inventario-mysql mysql -u root -proot inventario_db < /tmp/seed_colombia.sql
```

### Opción 3: Desde el archivo

```bash
docker exec -i inventario-mysql mysql -u root -proot inventario_db < backend/src/migrations/seed_colombia.sql
```

## Verificar Datos

```sql
-- Verificar país
SELECT * FROM paises;

-- Verificar departamentos
SELECT COUNT(*) FROM departamentos;

-- Verificar municipios de Santander
SELECT COUNT(*) FROM municipios WHERE departamentoId = 27;

-- Verificar municipios de Norte de Santander
SELECT COUNT(*) FROM municipios WHERE departamentoId = 22;

-- Ver todos los municipios de un departamento
SELECT m.municipioNombre, d.departamentoNombre 
FROM municipios m 
JOIN departamentos d ON m.departamentoId = d.departamentoId 
WHERE d.departamentoNombre = 'Santander';
```

## Notas

- El script incluye timestamps automáticos con `NOW()`
- Todos los registros tienen `estado = 1` (activo)
- Los códigos DANE están incluidos para referencia
- Si necesitas limpiar los datos, descomenta las líneas DELETE al inicio del script

## Estructura de Relaciones

```
Pais (Colombia)
 └── Departamento (32 departamentos)
      └── Municipio (87 de Santander + 40 de Norte de Santander)
```

## Próximos Pasos

Después de ejecutar este script:
1. Las Sedes se asocian a Departamentos
2. Las Oficinas se asocian a Municipios
3. Los usuarios pueden asignarse a Sedes, Oficinas y Bodegas específicas

