import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditoriaEliminacion, TipoEntidad } from './auditoria.entity';

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(AuditoriaEliminacion)
    private readonly auditoriaRepository: Repository<AuditoriaEliminacion>,
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

  async findOne(auditoriaId: number): Promise<AuditoriaEliminacion | null> {
    if (!auditoriaId || !Number.isFinite(Number(auditoriaId))) return null;
    return this.auditoriaRepository.findOne({ where: { auditoriaId } });
  }

  async findAll(filters?: {
    tipoEntidad?: TipoEntidad;
    entidadId?: number;
    entidadIds?: number[];
    usuarioId?: number;
    fechaDesde?: Date;
    fechaHasta?: Date;
  }): Promise<AuditoriaEliminacion[]> {
    const q = this.auditoriaRepository.createQueryBuilder('a');

    if (filters?.tipoEntidad) {
      q.andWhere('a.tipoEntidad = :tipoEntidad', { tipoEntidad: filters.tipoEntidad });
    }
    if (filters?.entidadId) {
      q.andWhere('a.entidadId = :entidadId', { entidadId: filters.entidadId });
    }
    if (filters?.entidadIds && filters.entidadIds.length > 0) {
      q.andWhere('a.entidadId IN (:...entidadIds)', { entidadIds: filters.entidadIds });
    }
    if (filters?.usuarioId) {
      q.andWhere('a.usuarioId = :usuarioId', { usuarioId: filters.usuarioId });
    }
    if (filters?.fechaDesde) {
      q.andWhere('a.fechaEliminacion >= :fechaDesde', { fechaDesde: filters.fechaDesde });
    }
    if (filters?.fechaHasta) {
      q.andWhere('a.fechaEliminacion <= :fechaHasta', { fechaHasta: filters.fechaHasta });
    }

    return q.orderBy('a.fechaEliminacion', 'DESC').getMany();
  }

  async findMovimientosEliminadosPorCodigo(movimientoCodigo: string): Promise<AuditoriaEliminacion[]> {
    const codigo = String(movimientoCodigo || '').trim();
    if (!codigo) return [];
    return this.auditoriaRepository
      .createQueryBuilder('a')
      .where('a.tipoEntidad = :tipoEntidad', { tipoEntidad: TipoEntidad.MOVIMIENTO })
      .andWhere("JSON_EXTRACT(a.datosEliminados, '$.movimientoCodigo') = :codigo", { codigo })
      .orderBy('a.fechaEliminacion', 'DESC')
      .getMany();
  }
}
