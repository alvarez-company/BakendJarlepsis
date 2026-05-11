import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PushTokensService } from './push-tokens.service';

@ApiTags('push-tokens')
@ApiBearerAuth()
@Controller('push-tokens')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PushTokensController {
  constructor(private readonly pushTokensService: PushTokensService) {}

  @Post('register')
  async register(@Req() req: any, @Body() body: { token: string; plataforma?: string }) {
    const userAgent = req?.headers?.['user-agent'];
    const saved = await this.pushTokensService.upsertToken({
      usuarioId: req.user.usuarioId,
      token: body?.token,
      plataforma: body?.plataforma,
      userAgent,
    });
    return { ok: true, pushTokenId: saved.pushTokenId };
  }
}
