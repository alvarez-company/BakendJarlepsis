import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditoriaEliminacion, TipoEntidad } from './auditoria.entity';

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(AuditoriaEliminacion)
    private auditoriaRepository: Repository<AuditoriaEliminacion>,
  ) {}

  async registrarEliminacion(
    tipoEntidad: TipoEntidad,
    entidadId: number,
    datosEliminados: any,
    usuarioId: number,
    motivo?: string,
    observaciones?: string,
  ): Promise<AuditoriaEliminacion> {
    const auditoria = this.auditoriaRepository.create({
      tipoEntidad,
      entidadId,
      datosEliminados,
      usuarioId,
      motivo,
      observaciones,
    });

    return await this.auditoriaRepository.save(auditoria);
  }
}
