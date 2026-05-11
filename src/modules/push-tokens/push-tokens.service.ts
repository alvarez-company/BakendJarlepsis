import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushToken } from './push-token.entity';

@Injectable()
export class PushTokensService {
  constructor(
    @InjectRepository(PushToken)
    private readonly pushTokensRepo: Repository<PushToken>,
  ) {}

  async upsertToken(params: {
    usuarioId: number;
    token: string;
    plataforma?: string;
    userAgent?: string;
  }): Promise<PushToken> {
    const plataforma = (params.plataforma || 'web').slice(0, 32);
    const token = params.token?.trim();
    if (!token) {
      throw new Error('Token inválido');
    }

    const existing = await this.pushTokensRepo.findOne({ where: { token } });
    if (existing) {
      existing.usuarioId = params.usuarioId;
      existing.plataforma = plataforma;
      existing.activo = true;
      existing.userAgent = params.userAgent?.slice(0, 512) ?? existing.userAgent ?? null;
      existing.lastSeenAt = new Date();
      return this.pushTokensRepo.save(existing);
    }

    const created = this.pushTokensRepo.create({
      usuarioId: params.usuarioId,
      plataforma,
      token,
      activo: true,
      userAgent: params.userAgent?.slice(0, 512) ?? null,
      lastSeenAt: new Date(),
    });
    return this.pushTokensRepo.save(created);
  }

  async getActiveTokensForUser(usuarioId: number): Promise<string[]> {
    const rows = await this.pushTokensRepo.find({
      where: { usuarioId, activo: true },
      select: ['token'],
    });
    return rows.map((r) => r.token).filter(Boolean);
  }

  async deactivateToken(token: string): Promise<void> {
    await this.pushTokensRepo.update({ token }, { activo: false });
  }
}
