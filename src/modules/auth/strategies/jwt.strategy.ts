import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Validar que payload.sub existe y es un número válido
    if (!payload.sub || isNaN(payload.sub)) {
      throw new UnauthorizedException('Token inválido: ID de usuario no encontrado');
    }

    // Usar findOneForAuth para no aplicar reglas de visibilidad (SuperAdmin no se lista pero sí debe validar el token)
    const user = await this.usersService.findOneForAuth(payload.sub);
    if (!user || !user.usuarioEstado) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }
    return user;
  }
}
