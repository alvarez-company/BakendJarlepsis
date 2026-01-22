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

    const user = await this.usersService.findOne(payload.sub);
    if (!user || !user.usuarioEstado) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }
    return user;
  }
}
