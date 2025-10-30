# 📜 Scripts de Postman para Automatización

## 🔐 Script de Login (Auto-Token)

Agrega este script en el **Tests** tab del request **Login**:

```javascript
// Verificar que el login fue exitoso
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has access_token", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('access_token');
});

// Guardar el token automáticamente
var jsonData = pm.response.json();
if (jsonData.access_token) {
    pm.environment.set("access_token", jsonData.access_token);
    console.log("✅ Token guardado automáticamente");
}
```

---

## 📊 Script para Guardar IDs Dinámicos

### Crear Material y Guardar ID

```javascript
pm.test("Material creado exitosamente", function () {
    pm.response.to.have.status(201);
    
    var jsonData = pm.response.json();
    pm.environment.set("material_id", jsonData.materialId);
    console.log("✅ Material ID guardado: " + jsonData.materialId);
});
```

### Crear Usuario y Guardar ID

```javascript
pm.test("Usuario creado exitosamente", function () {
    pm.response.to.have.status(201);
    
    var jsonData = pm.response.json();
    pm.environment.set("user_id", jsonData.usuarioId);
    console.log("✅ Usuario ID guardado: " + jsonData.usuarioId);
});
```

---

## 🔄 Script de Chain Requests

### Crear Cliente → Crear Instalación

En el **Tests** tab de "Crear Cliente":

```javascript
pm.test("Cliente creado", function () {
    pm.response.to.have.status(201);
    
    var jsonData = pm.response.json();
    pm.environment.set("cliente_id", jsonData.clienteId);
    
    // Ejecutar siguiente request automáticamente
    setTimeout(function() {
        pm.sendRequest({
            url: pm.environment.get("base_url") + "/instalaciones",
            method: 'POST',
            header: {
                'Authorization': 'Bearer ' + pm.environment.get("access_token"),
                'Content-Type': 'application/json'
            },
            body: {
                mode: 'raw',
                raw: JSON.stringify({
                    instalacionCodigo: "INST-002",
                    tipoInstalacionId: 1,
                    clienteId: jsonData.clienteId,
                    instalacionMedidorNumero: "MED-99999"
                })
            }
        }, function (err, res) {
            console.log("✅ Instalación creada automáticamente");
        });
    }, 1000);
});
```

---

## ⚠️ Script de Validación de Errores

### Validar Respuesta de Error

```javascript
pm.test("Error esperado", function () {
    pm.response.to.have.status(400);
    
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('message');
    pm.expect(jsonData).to.have.property('error');
    
    console.log("❌ Error: " + jsonData.message);
});
```

---

## 📋 Pre-request Scripts

### Generar Código Único

```javascript
// Generar código único para materiales
var timestamp = Date.now();
pm.environment.set("material_codigo", "MAT-" + timestamp);
console.log("Código generado: " + pm.environment.get("material_codigo"));
```

### Validar Token Antes de Request

```javascript
// Validar que existe token
if (!pm.environment.get("access_token")) {
    throw new Error("❌ No hay token de acceso. Ejecuta Login primero.");
}
```

---

## 🎯 Script de Prueba Completa

### Secuencia Automática de Pruebas

Crear un nuevo request llamado "Ejecutar Todo" con este script:

```javascript
// Secuencia de pruebas automáticas
pm.test("Flujo completo de pruebas", async function () {
    // 1. Login
    var loginResponse = await pm.sendRequest({
        url: pm.environment.get("base_url") + "/auth/login",
        method: 'POST',
        body: {
            mode: 'raw',
            raw: JSON.stringify({
                email: pm.environment.get("admin_email"),
                password: pm.environment.get("admin_password")
            })
        }
    });
    
    var loginData = loginResponse.json();
    pm.environment.set("access_token", loginData.access_token);
    console.log("✅ 1. Login exitoso");
    
    // 2. Crear material
    var materialResponse = await pm.sendRequest({
        url: pm.environment.get("base_url") + "/materiales",
        method: 'POST',
        header: {
            'Authorization': 'Bearer ' + loginData.access_token
        },
        body: {
            mode: 'raw',
            raw: JSON.stringify({
                categoriaId: 1,
                proveedorId: 1,
                inventarioId: 1,
                materialCodigo: "MAT-AUTO-" + Date.now(),
                materialNombre: "Material Automático",
                materialStock: 100,
                materialPrecio: 50000
            })
        }
    });
    
    var materialData = materialResponse.json();
    pm.environment.set("material_id", materialData.materialId);
    console.log("✅ 2. Material creado: " + materialData.materialId);
    
    // 3. Registrar entrada
    var entradaResponse = await pm.sendRequest({
        url: pm.environment.get("base_url") + "/movimientos",
        method: 'POST',
        header: {
            'Authorization': 'Bearer ' + loginData.access_token
        },
        body: {
            mode: 'raw',
            raw: JSON.stringify({
                materialId: materialData.materialId,
                movimientoTipo: "entrada",
                movimientoCantidad: 50,
                proveedorId: 1,
                usuarioId: 1
            })
        }
    });
    
    console.log("✅ 3. Entrada registrada");
    console.log("🎉 Flujo completo ejecutado exitosamente");
});
```

---

## 📝 Variables Útiles

```javascript
// Timestamp actual
var now = new Date().toISOString();

// ID aleatorio
var randomId = Math.floor(Math.random() * 10000);

// Código único
var codigo = "COD-" + Date.now() + "-" + randomId;
```

---

**Scripts listos para automatizar tus pruebas** 🤖

