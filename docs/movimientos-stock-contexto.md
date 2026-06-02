# Contexto de movimientos y stock (Jarlepsis)

Este documento consolida **cómo se mueve el stock** y **cómo se controlan medidores/seriales** en Jarlepsis, cruzando backend + frontend web + miniapp. Es la base para corregir inconsistencias de stock sin “romper” trazabilidad.

## Modelo de stock (fuente de verdad)

- **Stock por bodega**: tabla `materiales_bodegas` (campo `stock`) por `(materialId, bodegaId)`.
- **Stock por técnico**: tabla `inventario_tecnicos` (campo `cantidad`) por `(usuarioId, materialId)`.
- **Stock total del material**: `material.materialStock` se sincroniza como **suma de**:
  - stock en bodegas (`materiales_bodegas`)
  - stock en técnicos (`inventario_tecnicos`)

Archivo clave: `src/modules/materiales/materiales.service.ts` (`syncMaterialStock`/`sincronizarStock`).

## Entidades y conceptos clave (backend)

### `movimientos_inventario`
Representa operaciones **Entrada / Salida / Devolución** y sirve también como trazabilidad de algunos flujos.

- **Tipo**: `entrada | salida | devolucion` (`TipoMovimiento`).
- **Estado**: `pendiente | completada | cancelada` (por defecto `completada`).
- **Origen** (solo salidas/devoluciones relevantes):
  - `origenTipo`: `bodega | tecnico`
  - `tecnicoOrigenId` cuando `origenTipo=tecnico`
- **Seriales**: `numerosMedidor` (json con strings) por línea.

Archivo: `src/modules/movimientos/movimiento-inventario.entity.ts`.

### `numeros_medidor`
Controla **medidores/seriales** como unidades indivisibles.

- **Unicidad**: `numeroMedidor` es unique y además se valida **case-insensitive** (trim+lower) en el servicio.
- **Estados** (`EstadoNumeroMedidor`):
  - `DISPONIBLE`: inventario (puede tener `bodegaId` o `null`).
  - `ASIGNADO_TECNICO`: asignado a técnico (`usuarioId`, `inventarioTecnicoId`).
  - `EN_INSTALACION`: asociado a instalación (`instalacionId`, `instalacionMaterialId`), y por defecto se limpian referencias al técnico.
  - `INSTALADO`: cierre final (queda instalado).
- **Ubicación**:
  - `bodegaId` representa dónde “está” cuando está disponible.
  - al pasar a técnico/instalación, `bodegaId` tiende a quedar `null` (dependiendo del flujo).

Archivos: `src/modules/numeros-medidor/numero-medidor.entity.ts`, `src/modules/numeros-medidor/numeros-medidor.service.ts`.

## Matriz de movimientos → efecto en stock (regla del sistema actual)

> Nota: aquí “Centro operativo” se deriva de la **sede de la bodega** o de `usuarioSede` del técnico. No existe un stock de sede independiente: se compone de bodegas+técnicos.

### Tabla resumida (qué sube/baja y dónde)

- **Convenciones**:
  - **ΔBodegaOrigen**: cambio en `materiales_bodegas` de la bodega origen
  - **ΔBodegaDestino**: cambio en `materiales_bodegas` de la bodega destino
  - **ΔTecnicoOrigen/ΔTecnicoDestino**: cambio en `inventario_tecnicos`
  - **ΔCentroOperativo**: efecto neto a nivel sede (bodegas+técnicos)

| Operación | Endpoint(s) típico(s) | ΔBodegaOrigen | ΔBodegaDestino | ΔTecnicoOrigen | ΔTecnicoDestino | ΔCentroOperativo | Seriales (medidor) |
|---|---|---:|---:|---:|---:|---:|---|
| **Entrada a bodega** | `POST /movimientos` (`entrada`, `inventarioId`) | 0 | + | 0 | 0 | + | Crea `numeros_medidor` `DISPONIBLE` en bodega |
| **Entrada “a centro”** | `POST /movimientos` (`entrada`, `inventarioId=null`) | 0 | + (bodega tipo `centro`) | 0 | 0 | + | Igual que entrada a bodega |
| **Salida desde bodega** | `POST /movimientos` (`salida`, `origenTipo=bodega`) | - | 0 | 0 | 0 | - | Se registran seriales en movimiento; revertir libera |
| **Salida desde técnico** | `POST /movimientos` (`salida`, `origenTipo=tecnico`) | 0 | 0 | - | 0 | - | Seriales deben estar `ASIGNADO_TECNICO` al origen |
| **Devolución** | `POST /movimientos` (`devolucion`) | - | 0 | - (si origen técnico) | 0 | - | Igual que salida (regla actual) |
| **Traslado bodega→bodega** | `POST /traslados` + `POST /traslados/:id/completar` | - | + | 0 | 0 | 0 | Pasa seriales en ambos movimientos |
| **Asignación bodega→técnico** | `POST /inventario-tecnico/usuario/:id/asignar` | - (si bodega normal) | 0 | 0 | + | 0 | `DISPONIBLE` → `ASIGNADO_TECNICO` |
| **Retorno técnico→bodega** | `POST /inventario-tecnico/usuario/:id/retornar-bodega` | 0 | + | - | 0 | 0 | Ideal: `ASIGNADO_TECNICO` → `DISPONIBLE` en bodega |
| **Transferencia técnico→técnico** | `POST /inventario-tecnico/usuario/:id/transferir-tecnico` | 0 | 0 | - | + | 0 | Seriales se reasignan al técnico destino |
| **Instalación (consumo)** | `POST /instalaciones-materiales` | 0 | 0 | - | 0 | - | `ASIGNADO_TECNICO` → `EN_INSTALACION` |

> Importante: en el sistema actual, el stock del “centro operativo” **no es un bucket separado**; es el agregado sede = bodegas + técnicos.

## Reglas y validaciones críticas (backend)

### Resolución de inventario/bodega en `MovimientosService.create`
- Si `inventarioId` está presente: se valida existencia y permisos por rol/sede/bodega.
- Si `inventarioId === null` (entrada “a centro”): intenta resolver a la bodega tipo `centro` del centro operativo del usuario que registra.

Archivo: `src/modules/movimientos/movimientos.service.ts`.

### Medidores en entradas (anti-duplicados)
- Rechaza seriales duplicados dentro del mismo request.
- Rechaza seriales ya existentes en BD (case-insensitive).

Archivo: `numeros-medidor.service.ts` y validación previa en `movimientos.service.ts`.

## Reversión (update/remove) y por qué aquí nacen bugs de stock

### `MovimientosService.update`
Si el movimiento estaba `COMPLETADA` y tenía inventario, primero **revierte** el stock anterior y luego aplica el nuevo ajuste.

Riesgo: la reversión falla “silenciosamente” (catch vacío) y se continúa, pudiendo dejar stock desalineado.

### `MovimientosService.remove`
Si el movimiento estaba `COMPLETADA` y tiene inventario:
- Revierte stock en bodega invirtiendo el signo según tipo.
- Si hay `numerosMedidor` y el material es medidor:
  - al borrar una **ENTRADA**: intenta **borrar seriales** “creados recientemente” o, si no, liberarlos.
  - al borrar una **SALIDA/DEVOLUCIÓN**: libera de instalación y luego libera de técnico.

Riesgo importante: el servicio `NumerosMedidorService.asignarAInstalacion` limpia `usuarioId/inventarioTecnicoId`; entonces `liberarDeInstalacion` puede enviarlos a `DISPONIBLE` aunque el flujo quiera devolverlos a técnico (desacople cantidad vs serial).

Archivos: `movimientos.service.ts`, `numeros-medidor.service.ts`.

## Puntos frágiles priorizados (backend)

1. **Seriales al salir de instalación**: `asignarAInstalacion` limpia referencias al técnico, y `liberarDeInstalacion` decide el retorno basándose en `inventarioTecnicoId/usuarioId` que ya quedaron `null`.\n2. **Multi-paso sin transacción**: traslados completos (SALIDA+ENTRADA) y asignaciones (salida bodega + inventario técnico + seriales + sync) pueden quedar a medias.\n3. **`findByNumero()` ineficiente**: hoy carga toda la tabla y filtra en memoria; esto aumenta timeouts → reintentos → duplicidad.\n4. **Reversiones “best effort”**: update/remove continúan aunque falle parte del rollback, dejando inconsistencias silenciosas.

## Checklist de consistencia (para la fase de corrección)

- **Invariante 1 (stock total)**: para cada material \(M\), `materialStock(M) == sum(materiales_bodegas.stock) + sum(inventario_tecnicos.cantidad)`.\n- **Invariante 2 (medidores)**: para material medidor, el conteo de seriales `DISPONIBLE` por bodega y `ASIGNADO_TECNICO` por técnico debe corresponder a la “cantidad” visible en ese lugar.\n- **Invariante 3 (traslados)**: si un traslado está `COMPLETADO`, deben existir sus movimientos (SALIDA+ENTRADA) y el neto por sede debe ser 0.\n- **Invariante 4 (instalación)**: si un serial está `EN_INSTALACION`/`INSTALADO`, no puede estar simultáneamente asignado a técnico.

## Pendiente: mapeo frontend + miniapp

## Frontend web (FrontendJarlepsis) — pantallas, endpoints y payloads

### Servicios HTTP (endpoints usados)

- **Movimientos**: `src/services/movements.service.ts`
  - `GET /movimientos`, `GET /movimientos/grupos`, `GET /movimientos/codigo/:codigo`
  - `POST /movimientos` (timeout 0)
  - `PATCH /movimientos/:id`
  - `DELETE /movimientos/:id`
- **Traslados**: `src/services/transfers.service.ts`
  - `POST /traslados`
  - `POST /traslados/:id/completar`, `POST /traslados/:id/cancelar`
  - `DELETE /traslados/:id`, `DELETE /traslados/codigo/:codigo`
- **Inventario técnico (asignación/traslado a técnico)**: `src/services/inventario-tecnico.service.ts`
  - `POST /inventario-tecnico/usuario/:usuarioId/asignar`
- **Seriales**: `src/services/numeros-medidor.service.ts`
  - `GET /numeros-medidor`, `GET /numeros-medidor/material/:id`, `GET /numeros-medidor/usuario/:id`
  - `POST /numeros-medidor/crear-multiples`

### Flujos por tipo

#### Entradas (`/movimientos`, tipo `entrada`)
- UI arma el payload en `MovementFormPage.tsx`.
- Si hay medidores: el paso de captura se hace en `AgregarNumerosMedidorEntradaPage.tsx` y se guarda en `sessionStorage.numerosMedidorEntrada`.
- Finaliza en `ContinueMovementPage.tsx`:
  - si es entrada con medidores, **intenta crear seriales primero** con `POST /numeros-medidor/crear-multiples`
  - luego `POST /movimientos` con `movimientoCodigo` estable del cliente (idempotencia)

**Idempotencia (cliente)**:
- `src/utils/movementSubmitIdempotency.ts` guarda `jarlep.movement.clientMovimientoCodigo` en `sessionStorage`.
- `ContinueMovementPage` evita doble ejecución con `hasProcessed` (Strict Mode).

#### Salidas y devoluciones (`/movimientos`, tipo `salida|devolucion`)
- Cuando hay medidores, navega a `SeleccionarNumerosMedidorPage.tsx` para seleccionar seriales:
  - origen bodega: filtra `estado=disponible` y además filtra por `bodegaId === origen` o `bodegaId == null`
  - origen técnico: filtra `estado=asignado_tecnico` y por `usuarioId`
- Guarda `sessionStorage.numerosMedidorSeleccionados` y finaliza en `ContinueMovementPage.tsx` con `POST /movimientos`.

#### Traslados
- **Bodega→bodega**: `TransferenciaFormPage.tsx` usa `POST /traslados` (servicio `transfersService.create`).
  - Si hay medidores: `SeleccionarNumerosMedidorPage` → `ContinueTransferPage` → `POST /traslados`.
- **Bodega→técnico**: el mismo formulario dispara `inventarioTecnicoService.asignarMateriales(...)` (no usa `/traslados`).
  - Si hay medidores: `SeleccionarNumerosMedidorPage` → `ContinueTransferPage` → `POST /inventario-tecnico/.../asignar`.

#### Asignaciones (bodega→técnico)
- `AsignacionFormPage.tsx` llama `inventarioTecnicoService.asignarMateriales` y agrega `idempotencyKey` (cliente) para evitar duplicación por reintentos/doble clic.
- Medidores: usa `SeleccionarNumerosMedidorPage` y finaliza en `ContinueAssignmentPage.tsx`.

## Miniapp — instalaciones (miniapp-jarlep)

- Registro de consumo: `POST /instalaciones-materiales { instalacionId, materialId, cantidad, numerosMedidor? }`.
- Seriales: `GET /numeros-medidor/usuario/:usuarioId` y filtro por `estado=asignado_tecnico` en UI.
- No hay “optimistic update” de stock: se invalida cache y se recarga desde backend.

### Pantalla y reglas en UI
- Pantalla principal: `src/pages/InstalacionMaterialesUtilizadosPage.tsx`.
- Solo permite agregar/eliminar si el estado de instalación lo permite (`estadoPermiteEditarMateriales`).
- Para medidores:
  - obliga `cantidad = 1`
  - obliga seleccionar un serial del set filtrado: `materialId` + `estado=asignado_tecnico` + `usuarioId` (técnico logueado).

### Cómo refresca stock/inventario
- Inventario del técnico se trae por `GET /inventario-tecnico/usuario/:usuarioId`.
- Cache en `useInventarioTecnicoStore` (stale 45s), e invalida con `invalidateUsuario(usuarioId)` después de crear/eliminar material usado.
