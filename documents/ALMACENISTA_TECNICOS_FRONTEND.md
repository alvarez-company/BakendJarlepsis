# Rol Almacenista: Técnicos e inventario (Frontend)

Para el rol **almacenista**, el backend expone lo siguiente. El frontend debe mostrar en el **sidebar** un ítem **"Técnicos"** solo cuando el usuario tenga rol `almacenista`.

## Sidebar – ítem "Técnicos" (solo almacenista)

- **Ruta sugerida:** `/tecnicos` o `/tecnicos-mi-centro`
- **Visible solo si:** `user.rolTipo === 'almacenista'` (o equivalente)
- **Comportamiento:**
  - Lista de técnicos del **mismo centro operativo** (sede) del almacenista.
  - Al hacer clic en un técnico: ver **solo su inventario** (lectura).
  - No mostrar opciones de: editar técnico, eliminar técnico, bloquear, cancelar contrato.

## Endpoints backend para almacenista

| Acción | Método | Ruta | Descripción |
|--------|--------|------|-------------|
| Listar técnicos de mi centro | GET | `/users/tecnicos-mi-centro` | Paginado: `?page=1&limit=10&search=opcional` |
| Ver inventario de un técnico | GET | `/inventario-tecnico/usuario/:usuarioId` | Solo si el técnico es del mismo centro que el almacenista |

El almacenista **no** tiene acceso a:

- `GET /clientes`, `GET /clientes/:id` (información de empresa)
- `PATCH /users/:id`, `DELETE /users/:id`, `PATCH /users/:id/estado`, `PATCH /users/:id/cancelar-contrato` (ya restringidos por rol en el backend)

## Resumen de reglas almacenista

- **Aprobar material en instalación:** sí (`POST /instalaciones-materiales/:id/aprobar`).
- **Material en asignación:** al crear una asignación, el estado por defecto es **aprobada** (ya no pendiente por aprobación).
- **Ver empresa/clientes:** no (sidebar sin ítem Clientes/Empresa para almacenista).
- **Ver técnicos de su centro:** sí (ítem "Técnicos" en sidebar → lista + ver inventario solo lectura).
- **Editar/eliminar/bloquear/cancelar contrato a técnicos:** no (backend no expone esas acciones para almacenista).
