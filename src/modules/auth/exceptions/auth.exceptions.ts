import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';

export class UserNotFoundException extends UnauthorizedException {
  constructor() {
    super('Usuario no encontrado');
  }
}

export class UserInactiveException extends UnauthorizedException {
  constructor() {
    super('Usuario inactivo. Contacte al administrador');
  }
}

export class InvalidPasswordException extends UnauthorizedException {
  constructor() {
    super('Contraseña incorrecta');
  }
}

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super('Credenciales inválidas');
  }
}

export class EmailAlreadyExistsException extends ConflictException {
  constructor() {
    super('El correo electrónico ya está registrado');
  }
}

export class DocumentAlreadyExistsException extends ConflictException {
  constructor() {
    super('El documento ya está registrado');
  }
}

export class InvalidEmailFormatException extends BadRequestException {
  constructor() {
    super('Formato de correo electrónico inválido');
  }
}

export class WeakPasswordException extends BadRequestException {
  constructor() {
    super('La contraseña debe tener al menos 6 caracteres');
  }
}

