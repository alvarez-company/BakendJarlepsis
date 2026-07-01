import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { NovedadSistema, TipoNovedad } from './novedad-sistema.entity';
import { CreateNovedadSistemaDto } from './dto/create-novedad-sistema.dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { TipoNotificacion } from '../notificaciones/notificacion.entity';

@Injectable()
export class NovedadesSistemaService {
  constructor(
    @InjectRepository(NovedadSistema)
    private novedadesRepository: Repository<NovedadSistema>,
    @Inject(forwardRef(() => NotificacionesService))
    private notificacionesService: NotificacionesService,
  ) {}

  async create(
    createDto: CreateNovedadSistemaDto,
    publicadoPorId: number,
  ): Promise<NovedadSistema> {
    const novedad = this.novedadesRepository.create({
      ...createDto,
      publicadoPorId,
    });

    const saved = await this.novedadesRepository.save(novedad);
    return saved;
  }

  async crearDesdeRequerimiento(
    requerimientoId: number,
    titulo: string,
    descripcion: string,
    respuesta: string,
    tipo: TipoNovedad,
    publicadoPorId: number,
  ): Promise<NovedadSistema> {
    const cambiosDetallados = respuesta ? [respuesta] : [];

    const novedad = this.novedadesRepository.create({
      titulo,
      descripcion,
      tipo,
      requerimientoId,
      publicadoPorId,
      cambiosDetallados,
      destacada: true,
    });

    return this.novedadesRepository.save(novedad);
  }

  async findAll(options?: {
    limit?: number;
    soloActivas?: boolean;
    soloDestacadas?: boolean;
    incluirInactivas?: boolean;
  }): Promise<NovedadSistema[]> {
    const qb = this.novedadesRepository
      .createQueryBuilder('n')
      .leftJoinAndSelect('n.publicadoPor', 'publicadoPor')
      .leftJoinAndSelect('n.requerimiento', 'requerimiento');

    // Por defecto solo muestra activas, a menos que explícitamente se pida incluir inactivas
    if (options?.soloActivas !== false && !options?.incluirInactivas) {
      qb.andWhere('n.activa = :activa', { activa: true });
    }

    if (options?.soloDestacadas) {
      qb.andWhere('n.destacada = :destacada', { destacada: true });
    }

    qb.orderBy('n.fechaPublicacion', 'DESC');

    if (options?.limit) {
      qb.take(options.limit);
    }

    return qb.getMany();
  }

  async findRecientes(limit: number = 10): Promise<NovedadSistema[]> {
    return this.findAll({ limit, soloActivas: true });
  }

  async findNoVistas(ultimaVista: Date): Promise<NovedadSistema[]> {
    return this.novedadesRepository.find({
      where: {
        activa: true,
        fechaPublicacion: MoreThan(ultimaVista),
      },
      relations: ['publicadoPor'],
      order: { fechaPublicacion: 'DESC' },
    });
  }

  async findOne(id: number): Promise<NovedadSistema> {
    const novedad = await this.novedadesRepository.findOne({
      where: { novedadId: id },
      relations: ['publicadoPor', 'requerimiento'],
    });

    if (!novedad) {
      throw new NotFoundException(`Novedad #${id} no encontrada`);
    }

    return novedad;
  }

  async update(id: number, updateDto: Partial<CreateNovedadSistemaDto>): Promise<NovedadSistema> {
    const novedad = await this.findOne(id);
    Object.assign(novedad, updateDto);
    return this.novedadesRepository.save(novedad);
  }

  async desactivar(id: number): Promise<NovedadSistema> {
    const novedad = await this.findOne(id);
    novedad.activa = false;
    return this.novedadesRepository.save(novedad);
  }

  async activar(id: number): Promise<NovedadSistema> {
    const novedad = await this.findOne(id);
    novedad.activa = true;
    return this.novedadesRepository.save(novedad);
  }

  async remove(id: number): Promise<void> {
    const novedad = await this.findOne(id);
    await this.novedadesRepository.remove(novedad);
  }

  async contarNoVistas(ultimaVista: Date): Promise<number> {
    return this.novedadesRepository.count({
      where: {
        activa: true,
        fechaPublicacion: MoreThan(ultimaVista),
      },
    });
  }
}
