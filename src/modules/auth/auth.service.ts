import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    // 1. Verificar que el usuario existe
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // 2. Verificar que el usuario está activo
    if (!user.usuarioEstado) {
      throw new UnauthorizedException('Usuario inactivo. Contacte al administrador');
    }

    // 3. Verificar la contraseña
    if (!user.usuarioContrasena) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    const isPasswordValid = await bcrypt.compare(password, user.usuarioContrasena);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    // 4. Retornar usuario sin contraseña
    const { usuarioContrasena: _usuarioContrasena, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    try {
      const user = await this.validateUser(loginDto.email, loginDto.password);

      // Verificar que usuarioRol esté cargado
      if (!user.usuarioRol) {
        throw new UnauthorizedException('Error al obtener información del usuario');
      }

      const rolTipo = user.usuarioRol?.rolTipo || 'empleado';

      // Restringir login de técnico y soldador en el sistema principal (solo miniapp)
      if (rolTipo === 'tecnico' || rolTipo === 'soldador') {
        throw new UnauthorizedException(
          'Los técnicos y soldadores solo pueden iniciar sesión en la aplicación móvil',
        );
      }

      const payload = {
        email: user.usuarioCorreo,
        sub: user.usuarioId,
        role: rolTipo,
        usuarioId: user.usuarioId,
      };

      return {
        access_token: this.jwtService.sign(payload),
        user: {
          usuarioId: user.usuarioId,
          usuarioCorreo: user.usuarioCorreo,
          usuarioNombre: user.usuarioNombre,
          usuarioApellido: user.usuarioApellido,
          usuarioRolId: user.usuarioRolId,
          rolTipo: rolTipo,
          usuarioSede: user.usuarioSede,
          usuarioBodega: user.usuarioBodega,
          usuarioFoto: user.usuarioFoto,
        },
      };
    } catch (error) {
      // Re-lanzar errores de UnauthorizedException con el mensaje específico
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Error al iniciar sesión');
    }
  }

  async register(registerDto: RegisterDto) {
    try {
      // Validar que el email no exista
      const existingUserByEmail = await this.usersService.findByEmail(registerDto.usuarioCorreo);
      if (existingUserByEmail) {
        throw new ConflictException('El correo electrónico ya está registrado');
      }

      // Validar que el documento no exista
      const existingUserByDocument = await this.usersService.findByDocument(
        registerDto.usuarioDocumento,
      );
      if (existingUserByDocument) {
        throw new ConflictException('El documento ya está registrado');
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(registerDto.usuarioCorreo)) {
        throw new BadRequestException('Formato de correo electrónico inválido');
      }

      // Validar longitud de contraseña
      if (registerDto.usuarioContrasena.length < 6) {
        throw new BadRequestException('La contraseña debe tener al menos 6 caracteres');
      }

      // Crear usuario
      const user = await this.usersService.create(registerDto);
      const { usuarioContrasena: _usuarioContrasena, ...result } = user;
      return result;
    } catch (error) {
      // Re-lanzar errores específicos
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al registrar usuario');
    }
  }
}
