import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
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
      console.log('[Auth] Usuario no encontrado para:', email);
      throw new UnauthorizedException('Usuario no encontrado');
    }

    console.log('[Auth] Usuario encontrado:', {
      id: user.usuarioId,
      email: user.usuarioCorreo,
      estado: user.usuarioEstado,
      hasPassword: !!user.usuarioContrasena,
      passwordLength: user.usuarioContrasena?.length || 0,
      passwordPreview: user.usuarioContrasena?.substring(0, 30) || 'EMPTY',
    });

    // 2. Verificar que el usuario está activo
    if (!user.usuarioEstado) {
      console.log('[Auth] Usuario inactivo');
      throw new UnauthorizedException('Usuario inactivo. Contacte al administrador');
    }

    // 3. Verificar la contraseña
    if (!user.usuarioContrasena) {
      console.log('[Auth] ERROR: Usuario sin contraseña');
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    const isPasswordValid = await bcrypt.compare(password, user.usuarioContrasena);
    console.log('[Auth] Comparación de contraseña:', {
      passwordProvided: password,
      isValid: isPasswordValid,
    });

    if (!isPasswordValid) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    // 4. Retornar usuario sin contraseña
    const { usuarioContrasena, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    try {
      const user = await this.validateUser(loginDto.email, loginDto.password);
      
      // Verificar que usuarioRol esté cargado
      if (!user.usuarioRol) {
        console.log('[Auth] ERROR: usuarioRol no está cargado en el usuario');
        throw new UnauthorizedException('Error al obtener información del usuario');
      }

      const rolTipo = user.usuarioRol?.rolTipo || 'empleado';
      
      const payload = {
        email: user.usuarioCorreo,
        sub: user.usuarioId,
        role: rolTipo,
        usuarioId: user.usuarioId,
      };

      console.log('[Auth] Login exitoso:', {
        userId: user.usuarioId,
        email: user.usuarioCorreo,
        rolTipo,
      });

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
          usuarioOficina: user.usuarioOficina,
          usuarioBodega: user.usuarioBodega,
        },
      };
    } catch (error) {
      // Re-lanzar errores de UnauthorizedException con el mensaje específico
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('[Auth] Error en login:', error);
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
      const existingUserByDocument = await this.usersService.findByDocument(registerDto.usuarioDocumento);
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
      const { usuarioContrasena, ...result } = user;
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
