import {
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

// ==========================================
// EXCEPCIONES DE ELIMINACIÓN
// ==========================================

export class CannotDeleteException extends BadRequestException {
  constructor(message: string, relatedEntities?: any[]) {
    super({
      statusCode: 400,
      message,
      error: 'No se puede eliminar',
      relatedEntities: relatedEntities || [],
    });
  }
}

export class HasDependenciesException extends BadRequestException {
  constructor(entityName: string, dependencies: string[]) {
    const dependenciesList = dependencies.join(', ');
    super({
      statusCode: 400,
      message: `No se puede eliminar ${entityName} porque tiene dependencias: ${dependenciesList}`,
      error: 'Error de dependencias',
      dependencies,
    });
  }
}

export class InUseException extends BadRequestException {
  constructor(entityName: string, usage: string) {
    super({
      statusCode: 400,
      message: `No se puede eliminar ${entityName} porque está en uso: ${usage}`,
      error: 'Entidad en uso',
      usage,
    });
  }
}

export class HasSubcategoriesException extends BadRequestException {
  constructor(categoriaNombre: string, count: number) {
    super({
      statusCode: 400,
      message: `No se puede eliminar la categoría "${categoriaNombre}" porque tiene ${count} subcategoría(s) asociada(s)`,
      error: 'No se puede eliminar categoría con subcategorías',
      subcategoriesCount: count,
    });
  }
}

export class HasMaterialsException extends BadRequestException {
  constructor(entityName: string, count: number) {
    super({
      statusCode: 400,
      message: `No se puede eliminar ${entityName} porque tiene ${count} material(es) asociado(s)`,
      error: 'Entidad con materiales',
      materialsCount: count,
    });
  }
}

export class HasMovementsException extends BadRequestException {
  constructor(entityName: string, count: number) {
    super({
      statusCode: 400,
      message: `No se puede eliminar ${entityName} porque tiene ${count} movimiento(s) registrado(s)`,
      error: 'Entidad con movimientos',
      movementsCount: count,
    });
  }
}

export class HasUsersException extends BadRequestException {
  constructor(entityName: string, count: number) {
    super({
      statusCode: 400,
      message: `No se puede eliminar ${entityName} porque tiene ${count} usuario(s) asignado(s)`,
      error: 'Entidad con usuarios',
      usersCount: count,
    });
  }
}

export class HasRelatedEntitiesException extends BadRequestException {
  constructor(entityName: string, relations: { [key: string]: number }) {
    const relationsList = Object.entries(relations)
      .map(([key, value]) => `${value} ${key}`)
      .join(', ');

    super({
      statusCode: 400,
      message: `No se puede eliminar ${entityName} porque tiene: ${relationsList}`,
      error: 'Entidad con relaciones',
      relations,
    });
  }
}

export class HasPendingOperationsException extends BadRequestException {
  constructor(entityName: string, operations: string[]) {
    super({
      statusCode: 400,
      message: `No se puede eliminar ${entityName} porque tiene operaciones pendientes: ${operations.join(', ')}`,
      error: 'Entidad con operaciones pendientes',
      operations,
    });
  }
}

// ==========================================
// EXCEPCIONES DE INVENTARIO Y STOCK
// ==========================================

export class StockInsufficientException extends BadRequestException {
  constructor(materialName: string, requested: number, available: number) {
    super({
      statusCode: 400,
      message: `Stock insuficiente para "${materialName}". Solicitado: ${requested}, Disponible: ${available}`,
      error: 'Stock insuficiente',
      materialName,
      requested,
      available,
    });
  }
}

export class NegativeStockException extends BadRequestException {
  constructor(materialName: string, attemptedStock: number) {
    super({
      statusCode: 400,
      message: `No se puede establecer stock negativo para "${materialName}". Valor intentado: ${attemptedStock}`,
      error: 'Stock negativo inválido',
      materialName,
      attemptedStock,
    });
  }
}

export class InvalidQuantityException extends BadRequestException {
  constructor(quantity: number, minAllowed?: number, maxAllowed?: number) {
    let message = `Cantidad inválida: ${quantity}`;
    if (minAllowed !== undefined) message += `. Mínimo permitido: ${minAllowed}`;
    if (maxAllowed !== undefined) message += `. Máximo permitido: ${maxAllowed}`;

    super({
      statusCode: 400,
      message,
      error: 'Cantidad inválida',
      quantity,
      minAllowed,
      maxAllowed,
    });
  }
}

export class BelowMinimumStockException extends BadRequestException {
  constructor(materialName: string, currentStock: number, minimumStock: number) {
    super({
      statusCode: 400,
      message: `Stock por debajo del mínimo para "${materialName}". Actual: ${currentStock}, Mínimo: ${minimumStock}`,
      error: 'Stock por debajo del mínimo',
      materialName,
      currentStock,
      minimumStock,
    });
  }
}

export class AboveMaximumStockException extends BadRequestException {
  constructor(materialName: string, currentStock: number, maximumStock: number) {
    super({
      statusCode: 400,
      message: `Stock por encima del máximo para "${materialName}". Actual: ${currentStock}, Máximo: ${maximumStock}`,
      error: 'Stock por encima del máximo',
      materialName,
      currentStock,
      maximumStock,
    });
  }
}

// ==========================================
// EXCEPCIONES DE ESTADO Y FLUJO
// ==========================================

export class InvalidStatusException extends BadRequestException {
  constructor(currentStatus: string, validStatuses: string[]) {
    super({
      statusCode: 400,
      message: `Estado inválido: ${currentStatus}. Estados válidos: ${validStatuses.join(', ')}`,
      error: 'Estado inválido',
      currentStatus,
      validStatuses,
    });
  }
}

export class AlreadyCompletedException extends BadRequestException {
  constructor(entityName: string, entityId: number) {
    super({
      statusCode: 400,
      message: `${entityName} con ID ${entityId} ya está completado`,
      error: 'Entidad ya completada',
      entityName,
      entityId,
    });
  }
}

export class AlreadyCancelledException extends BadRequestException {
  constructor(entityName: string, entityId: number) {
    super({
      statusCode: 400,
      message: `${entityName} con ID ${entityId} ya está cancelado`,
      error: 'Entidad ya cancelada',
      entityName,
      entityId,
    });
  }
}

export class CannotCancelException extends BadRequestException {
  constructor(entityName: string, reason: string) {
    super({
      statusCode: 400,
      message: `No se puede cancelar ${entityName}: ${reason}`,
      error: 'No se puede cancelar',
      reason,
    });
  }
}

export class CannotCompleteException extends BadRequestException {
  constructor(entityName: string, reason: string) {
    super({
      statusCode: 400,
      message: `No se puede completar ${entityName}: ${reason}`,
      error: 'No se puede completar',
      reason,
    });
  }
}

export class InvalidTransitionException extends BadRequestException {
  constructor(fromStatus: string, toStatus: string) {
    super({
      statusCode: 400,
      message: `Transición inválida de estado: ${fromStatus} → ${toStatus}`,
      error: 'Transición de estado inválida',
      fromStatus,
      toStatus,
    });
  }
}

// ==========================================
// EXCEPCIONES DE AUTORIZACIÓN Y PERMISOS
// ==========================================

export class UnauthorizedOperationException extends UnauthorizedException {
  constructor(operation: string, reason?: string) {
    super({
      statusCode: 401,
      message: `Operación no autorizada: ${operation}${reason ? `. ${reason}` : ''}`,
      error: 'Operación no autorizada',
      operation,
      reason,
    });
  }
}

export class InsufficientPermissionsException extends ForbiddenException {
  constructor(requiredPermissions: string[], userPermissions: string[]) {
    super({
      statusCode: 403,
      message: `Permisos insuficientes. Requeridos: ${requiredPermissions.join(', ')}`,
      error: 'Permisos insuficientes',
      requiredPermissions,
      userPermissions,
    });
  }
}

export class CannotModifyOwnRoleException extends ForbiddenException {
  constructor() {
    super({
      statusCode: 403,
      message: 'No puedes modificar tu propio rol',
      error: 'Modificación de rol prohibida',
    });
  }
}

export class CannotDeactivateYourselfException extends ForbiddenException {
  constructor() {
    super({
      statusCode: 403,
      message: 'No puedes desactivar tu propia cuenta',
      error: 'Auto-desactivación prohibida',
    });
  }
}

export class EntityNotFoundInContextException extends ForbiddenException {
  constructor(entityName: string, entityId: number) {
    super({
      statusCode: 403,
      message: `No tienes acceso a ${entityName} con ID ${entityId}`,
      error: 'Entidad no encontrada en tu contexto',
      entityName,
      entityId,
    });
  }
}

// ==========================================
// EXCEPCIONES DE DUPLICADOS Y CONFLICTOS
// ==========================================

export class DuplicateEntityException extends ConflictException {
  constructor(entityName: string, field: string, value: string) {
    super({
      statusCode: 409,
      message: `${entityName} con ${field} "${value}" ya existe`,
      error: 'Entidad duplicada',
      entityName,
      field,
      value,
    });
  }
}

export class DuplicateEmailException extends ConflictException {
  constructor(email: string) {
    super({
      statusCode: 409,
      message: `El correo electrónico "${email}" ya está registrado`,
      error: 'Correo duplicado',
      email,
    });
  }
}

export class DuplicateDocumentException extends ConflictException {
  constructor(document: string) {
    super({
      statusCode: 409,
      message: `El documento "${document}" ya está registrado`,
      error: 'Documento duplicado',
      document,
    });
  }
}

export class DuplicateCodeException extends ConflictException {
  constructor(codeType: string, code: string) {
    super({
      statusCode: 409,
      message: `El código ${codeType} "${code}" ya existe`,
      error: 'Código duplicado',
      codeType,
      code,
    });
  }
}

// ==========================================
// EXCEPCIONES DE VALIDACIÓN
// ==========================================

export class InvalidDateRangeException extends BadRequestException {
  constructor(startDate: Date, endDate: Date) {
    super({
      statusCode: 400,
      message: `Rango de fechas inválido. Fecha fin debe ser posterior a fecha inicio`,
      error: 'Rango de fechas inválido',
      startDate,
      endDate,
    });
  }
}

export class InvalidDateException extends BadRequestException {
  constructor(date: string, field: string) {
    super({
      statusCode: 400,
      message: `Fecha inválida en ${field}: ${date}`,
      error: 'Fecha inválida',
      date,
      field,
    });
  }
}

export class CircularReferenceException extends BadRequestException {
  constructor(entityName: string, reference: string) {
    super({
      statusCode: 400,
      message: `Referencia circular detectada en ${entityName}: ${reference}`,
      error: 'Referencia circular',
      entityName,
      reference,
    });
  }
}

export class InvalidEmailFormatException extends BadRequestException {
  constructor(email: string) {
    super({
      statusCode: 400,
      message: `Formato de correo electrónico inválido: ${email}`,
      error: 'Email inválido',
      email,
    });
  }
}

export class WeakPasswordException extends BadRequestException {
  constructor(minLength: number) {
    super({
      statusCode: 400,
      message: `La contraseña debe tener al menos ${minLength} caracteres`,
      error: 'Contraseña débil',
      minLength,
    });
  }
}

export class InvalidPhoneNumberException extends BadRequestException {
  constructor(phone: string) {
    super({
      statusCode: 400,
      message: `Número de teléfono inválido: ${phone}`,
      error: 'Teléfono inválido',
      phone,
    });
  }
}

// ==========================================
// EXCEPCIONES DE TRASLADOS
// ==========================================

export class SameOriginDestinationException extends BadRequestException {
  constructor() {
    super({
      statusCode: 400,
      message: 'El origen y destino del traslado no pueden ser iguales',
      error: 'Origen y destino iguales',
    });
  }
}

export class InvalidTransferQuantityException extends BadRequestException {
  constructor(requested: number, available: number) {
    super({
      statusCode: 400,
      message: `Cantidad de traslado inválida. Solicitado: ${requested}, Disponible: ${available}`,
      error: 'Cantidad de traslado inválida',
      requested,
      available,
    });
  }
}

export class TransferAlreadyCompletedException extends BadRequestException {
  constructor(transferId: number) {
    super({
      statusCode: 400,
      message: `El traslado ${transferId} ya está completado`,
      error: 'Traslado ya completado',
      transferId,
    });
  }
}

export class TransferCannotBeCancelledException extends BadRequestException {
  constructor(transferId: number, reason: string) {
    super({
      statusCode: 400,
      message: `El traslado ${transferId} no puede ser cancelado: ${reason}`,
      error: 'No se puede cancelar traslado',
      transferId,
      reason,
    });
  }
}

// ==========================================
// EXCEPCIONES DE INSTALACIONES
// ==========================================

export class InstallationAlreadyAssignedException extends ConflictException {
  constructor(installationId: number, userId: number) {
    super({
      statusCode: 409,
      message: `La instalación ${installationId} ya está asignada al usuario ${userId}`,
      error: 'Instalación ya asignada',
      installationId,
      userId,
    });
  }
}

export class CannotAssignOwnInstallationException extends BadRequestException {
  constructor() {
    super({
      statusCode: 400,
      message: 'No puedes asignar instalaciones a ti mismo',
      error: 'Auto-asignación prohibida',
    });
  }
}

// ==========================================
// EXCEPCIONES DE ROLES
// ==========================================

export class InvalidRoleException extends BadRequestException {
  constructor(role: string, validRoles: string[]) {
    super({
      statusCode: 400,
      message: `Rol inválido: ${role}. Roles válidos: ${validRoles.join(', ')}`,
      error: 'Rol inválido',
      role,
      validRoles,
    });
  }
}

export class CannotRemoveRoleException extends BadRequestException {
  constructor(roleName: string, reason: string) {
    super({
      statusCode: 400,
      message: `No se puede eliminar el rol "${roleName}": ${reason}`,
      error: 'No se puede eliminar rol',
      roleName,
      reason,
    });
  }
}

// ==========================================
// EXCEPCIONES DE MIGRACIONES Y BD
// ==========================================

export class DatabaseConnectionException extends BadRequestException {
  constructor(message: string) {
    super({
      statusCode: 500,
      message: `Error de conexión a la base de datos: ${message}`,
      error: 'Error de base de datos',
    });
  }
}

export class TransactionFailedException extends BadRequestException {
  constructor(reason: string) {
    super({
      statusCode: 500,
      message: `La transacción falló: ${reason}`,
      error: 'Transacción fallida',
      reason,
    });
  }
}

// ==========================================
// EXCEPCIONES DE RATE LIMITING
// ==========================================

export class TooManyRequestsException extends BadRequestException {
  constructor(retryAfter?: number) {
    super({
      statusCode: 429,
      message: 'Demasiadas solicitudes. Por favor intenta más tarde',
      error: 'Demasiadas solicitudes',
      retryAfter,
    });
  }
}

export class MaxRetriesExceededException extends BadRequestException {
  constructor(maxRetries: number) {
    super({
      statusCode: 400,
      message: `Se excedió el número máximo de reintentos: ${maxRetries}`,
      error: 'Máximo de reintentos excedido',
      maxRetries,
    });
  }
}
