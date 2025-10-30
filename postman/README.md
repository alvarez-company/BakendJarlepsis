# 📮 Colección de Postman - Estudio API

## 🚀 Importar Colección

### Opción 1: Importar desde Archivo
1. Abre Postman
2. Click en **Import**
3. Selecciona `Estudio_API.postman_collection.json`
4. Selecciona `Estudio_API_Environment.postman_environment.json`
5. Click en **Import**

### Opción 2: Importar desde URL
1. Click en **Import**
2. Selecciona **Link**
3. Pega la URL del archivo JSON
4. Click en **Continue** → **Import**

---

## 🔐 Configuración Inicial

### 1. Configurar Variables de Entorno

Selecciona el environment **"Estudio API - Environment"** y configura:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `base_url` | `http://localhost:3000/api/v1` | URL base de la API |
| `access_token` | (se llena automáticamente) | Token JWT |
| `admin_email` | `admin@estudio.com` | Email del admin |
| `admin_password` | `password123` | Contraseña del admin |

### 2. Obtener Token de Acceso

1. Ejecuta el request **"Login"** en la carpeta de Autenticación
2. Copia el `access_token` de la respuesta
3. Pégalo en la variable `access_token` del environment

---

## 📋 Estructura de la Colección

### 1. Autenticación
- ✅ Login

### 2. Usuarios
- ✅ Crear Usuario
- ✅ Listar Usuarios
- ✅ Obtener Usuario
- ✅ Actualizar Estado Usuario
- ✅ Cambiar Rol

### 3. Materiales
- ✅ Crear Material
- ✅ Listar Materiales
- ✅ Obtener Material

### 4. Movimientos
- ✅ Registrar Entrada
- ✅ Registrar Salida
- ✅ Registrar Devolución
- ✅ Listar Movimientos

### 5. Traslados
- ✅ Crear Traslado
- ✅ Completar Traslado
- ✅ Listar Traslados

### 6. Instalaciones
- ✅ Crear Instalación
- ✅ Asignar Usuarios a Instalación
- ✅ Listar Instalaciones

### 7. Clientes
- ✅ Crear Cliente
- ✅ Listar Clientes

### 8. Chat y Estados
- ✅ Actualizar Estado
- ✅ Ver Mi Estado
- ✅ Enviar Mensaje
- ✅ Responder Mensaje
- ✅ Ver Mensajes del Grupo
- ✅ Reaccionar a Mensaje

### 9. Proyectos
- ✅ Crear Proyecto
- ✅ Agregar Item a Proyecto
- ✅ Listar Proyectos

### 10. Categorías
- ✅ Crear Categoría
- ✅ Crear Subcategoría
- ✅ Listar Categorías
- ✅ Ver Subcategorías

### 11. Proveedores
- ✅ Crear Proveedor
- ✅ Listar Proveedores

---

## 🎯 Flujo de Pruebas Recomendado

### Fase 1: Configuración
1. ✅ Importar colección y environment
2. ✅ Ejecutar Login para obtener token
3. ✅ Configurar variables de entorno

### Fase 2: Datos Base
1. ✅ Crear Proveedor
2. ✅ Crear Categoría
3. ✅ Crear Material
4. ✅ Crear Cliente

### Fase 3: Operaciones
1. ✅ Registrar Entrada de material
2. ✅ Crear Instalación
3. ✅ Asignar usuarios a instalación
4. ✅ Registrar Salida para instalación

### Fase 4: Chat
1. ✅ Actualizar estado a "ocupado"
2. ✅ Enviar mensaje al grupo
3. ✅ Responder mensaje
4. ✅ Reaccionar a mensaje

---

## 💡 Tips de Uso

### Variables Dinámicas
Los endpoints con `:id` usan variables que puedes cambiar:
- `{{user_id}}` para usuarios
- `{{material_id}}` para materiales
- `{{grupo_id}}` para grupos

### Automatización
Usa scripts de Postman para:
- Extraer token automáticamente del login
- Guardar IDs de entidades creadas
- Chain requests (crear material → registrar entrada)

### Ejemplo de Script
```javascript
// En el Test tab del Login request
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Has access token", function () {
    var jsonData = pm.response.json();
    pm.environment.set("access_token", jsonData.access_token);
});
```

---

## 🔍 Verificar Swagger

La documentación completa está disponible en:
```
http://localhost:3000/api/docs
```

---

## 📝 Notas

- Todos los endpoints requieren autenticación excepto Login
- Los tokens JWT expiran después de 24h
- Usa el token generado en cada request
- Los IDs son ejemplos, ajusta según tu base de datos

---

**Colección de Postman lista para usar** 📮

