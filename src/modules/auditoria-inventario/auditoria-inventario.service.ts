import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditoriaInventario, TipoCambioInventario } from './auditoria-inventario.entity';

@Injectable()
export class AuditoriaInventarioService {
  constructor(
    @InjectRepository(AuditoriaInventario)
    private auditoriaRepository: Repository<AuditoriaInventario>,
  ) {}

  /**
   * Registra un cambio en el inventario
   */
  async registrarCambio(data: {
    materialId: number;
    tipoCambio: TipoCambioInventario;
    usuarioId: number;
    descripcion?: string;
    datosAnteriores?: any;
    datosNuevos?: any;
    cantidadAnterior?: number;
    cantidadNueva?: number;
    diferencia?: number;
    bodegaId?: number;
    movimientoId?: number;
    trasladoId?: number;
    observaciones?: string;
  }): Promise<AuditoriaInventario> {
    const auditoria = this.auditoriaRepository.create({
      materialId: data.materialId,
      tipoCambio: data.tipoCambio,
      usuarioId: data.usuarioId,
      descripcion: data.descripcion,
      datosAnteriores: data.datosAnteriores,
      datosNuevos: data.datosNuevos,
      cantidadAnterior: data.cantidadAnterior,
      cantidadNueva: data.cantidadNueva,
      diferencia: data.diferencia,
      bodegaId: data.bodegaId,
      movimientoId: data.movimientoId,
      trasladoId: data.trasladoId,
      observaciones: data.observaciones,
    });

    return this.auditoriaRepository.save(auditoria);
  }

  /**
   * Obtiene el histórico de cambios de un material
   */
  async findByMaterial(materialId: number): Promise<AuditoriaInventario[]> {
    return this.auditoriaRepository.find({
      where: { materialId },
      relations: ['usuario', 'bodega', 'material'],
      order: { fechaCreacion: 'DESC' },
    });
  }

  /**
   * Obtiene el histórico de cambios por usuario
   */
  async findByUsuario(usuarioId: number): Promise<AuditoriaInventario[]> {
    return this.auditoriaRepository.find({
      where: { usuarioId },
      relations: ['material', 'bodega'],
      order: { fechaCreacion: 'DESC' },
    });
  }

  /**
   * Obtiene todos los cambios de auditoría con filtros opcionales
   */
  async findAll(filters?: {
    materialId?: number;
    usuarioId?: number;
    tipoCambio?: TipoCambioInventario;
    fechaDesde?: Date;
    fechaHasta?: Date;
  }): Promise<AuditoriaInventario[]> {
    const query = this.auditoriaRepository.createQueryBuilder('auditoria')
      .leftJoinAndSelect('auditoria.material', 'material')
      .leftJoinAndSelect('auditoria.usuario', 'usuario')
      .leftJoinAndSelect('auditoria.bodega', 'bodega');

    if (filters?.materialId) {
      query.andWhere('auditoria.materialId = :materialId', { materialId: filters.materialId });
    }

    if (filters?.usuarioId) {
      query.andWhere('auditoria.usuarioId = :usuarioId', { usuarioId: filters.usuarioId });
    }

    if (filters?.tipoCambio) {
      query.andWhere('auditoria.tipoCambio = :tipoCambio', { tipoCambio: filters.tipoCambio });
    }

    if (filters?.fechaDesde) {
      query.andWhere('auditoria.fechaCreacion >= :fechaDesde', { fechaDesde: filters.fechaDesde });
    }

    if (filters?.fechaHasta) {
      query.andWhere('auditoria.fechaCreacion <= :fechaHasta', { fechaHasta: filters.fechaHasta });
    }

    return query.orderBy('auditoria.fechaCreacion', 'DESC').getMany();
  }
}

