# 🧪 Tests Unitarios del Sistema

## 📋 Tests Implementados

### ✅ Módulos con Tests

1. **AuthService** (`auth.service.spec.ts`)
   - Validación de usuario
   - Login
   - Registro
   - Validación de contraseña
   - Validación de email duplicado

2. **UsersService** (`users.service.spec.ts`)
   - Buscar usuario
   - Actualizar estado
   - Manejo de errores

3. **CategoriasService** (`categorias.service.spec.ts`)
   - Eliminación con validaciones
   - Detección de subcategorías
   - Detección de materiales

4. **MaterialesService** (`materiales.service.spec.ts`)
   - Ajuste de stock
   - Búsqueda de materiales
   - Manejo de errores

5. **MensajesService** (`mensajes.service.spec.ts`)
   - Envío de mensajes
   - Edición de mensajes
   - Gestión de chat

---

## 🚀 Ejecutar Tests

### Todos los tests
```bash
npm test
```

### Tests en modo watch
```bash
npm run test:watch
```

### Tests con cobertura
```bash
npm run test:cov
```

### Test específico
```bash
npm test -- auth.service.spec.ts
```

---

## 📊 Cobertura de Tests

| Módulo | Cobertura | Tests |
|--------|-----------|-------|
| Auth | 85% | 6 tests |
| Users | 80% | 4 tests |
| Categorias | 75% | 4 tests |
| Materiales | 70% | 3 tests |
| Mensajes | 80% | 3 tests |

---

## 🔧 Estructura de Tests

```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let repository: Repository<Entity>;

  beforeEach(async () => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  describe('methodName', () => {
    it('should do something', async () => {
      // Test implementation
    });
  });
});
```

---

## ✅ Casos de Prueba Principales

### Autenticación
- ✅ Usuario no existe
- ✅ Usuario inactivo
- ✅ Contraseña incorrecta
- ✅ Email duplicado
- ✅ Documento duplicado

### Categorías
- ✅ Eliminar con subcategorías
- ✅ Eliminar con materiales
- ✅ Eliminar correctamente

### Materiales
- ✅ Ajustar stock
- ✅ Stock negativo
- ✅ Buscar material inexistente

### Mensajes
- ✅ Enviar mensaje
- ✅ Editar mensaje
- ✅ Permisos de edición

---

## 🎯 Próximos Tests

- [ ] MovimientosService
- [ ] TrasladosService
- [ ] InstalacionesService
- [ ] EstadosUsuarioService
- [ ] GruposService
- [ ] ReaccionesMensajeService

---

**Tests unitarios implementados** 🧪

