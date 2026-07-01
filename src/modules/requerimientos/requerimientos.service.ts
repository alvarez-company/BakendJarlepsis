import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import {
  Requerimiento,
  TipoRequerimiento,
  EstadoRequerimiento,
  PrioridadRequerimiento,
  CategoriaRequerimiento,
} from './requerimiento.entity';
import { CreateRequerimientoDto } from './dto/create-requerimiento.dto';
import { UpdateRequerimientoDto } from './dto/update-requerimiento.dto';
import { NovedadesSistemaService } from '../novedades-sistema/novedades-sistema.service';
import { TipoNovedad } from '../novedades-sistema/novedad-sistema.entity';

interface RequerimientosQuery {
  page?: number;
  limit?: number;
  tipo?: TipoRequerimiento;
  estado?: EstadoRequerimiento;
  prioridad?: PrioridadRequerimiento;
  categoria?: CategoriaRequerimiento;
  solicitanteId?: number;
  asignadoId?: number;
  sedeId?: number;
  busqueda?: string;
}

interface UserPayload {
  usuarioId: number;
  rolNombre: string;
  sedeId?: number;
}

const ROLES_DESARROLLO = ['superadmin'];
const ROLES_GERENCIA = ['superadmin', 'gerencia'];
const ROLES_ADMIN = ['superadmin', 'gerencia', 'admin', 'admin-internas', 'admin-redes'];

@Injectable()
export class RequerimientosService {
  constructor(
    @InjectRepository(Requerimiento)
    private requerimientosRepository: Repository<Requerimiento>,
    @Inject(forwardRef(() => NovedadesSistemaService))
    private novedadesSistemaService: NovedadesSistemaService,
  ) {}

  private async generarCodigo(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REQ-${year}-`;

    const ultimoRequerimiento = await this.requerimientosRepository
      .createQueryBuilder('r')
      .where('r.codigo LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('r.requerimientoId', 'DESC')
      .getOne();

    let secuencia = 1;
    if (ultimoRequerimiento) {
      const match = ultimoRequerimiento.codigo.match(/REQ-\d{4}-(\d+)/);
      if (match) {
        secuencia = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}${secuencia.toString().padStart(5, '0')}`;
  }

  private puedeVerRequerimiento(user: UserPayload, requerimiento: Requerimiento): boolean {
    if (ROLES_DESARROLLO.includes(user.rolNombre)) {
      return true;
    }

    if (requerimiento.solicitanteId === user.usuarioId) {
      return true;
    }

    if (requerimiento.asignadoId === user.usuarioId) {
      return true;
    }

    if (
      requerimiento.tipo === TipoRequerimiento.INTERNO_GERENCIA &&
      ROLES_GERENCIA.includes(user.rolNombre)
    ) {
      return true;
    }

    if (
      requerimiento.tipo === TipoRequerimiento.INTERNO_ADMIN &&
      ROLES_ADMIN.includes(user.rolNombre)
    ) {
      return true;
    }

    if (
      ROLES_ADMIN.includes(user.rolNombre) &&
      requerimiento.sedeId &&
      requerimiento.sedeId === user.sedeId
    ) {
      return true;
    }

    return false;
  }

  private puedeEditarRequerimiento(user: UserPayload, requerimiento: Requerimiento): boolean {
    if (ROLES_DESARROLLO.includes(user.rolNombre)) {
      return true;
    }

    if (
      requerimiento.solicitanteId === user.usuarioId &&
      requerimiento.estado === EstadoRequerimiento.PENDIENTE
    ) {
      return true;
    }

    if (requerimiento.asignadoId === user.usuarioId) {
      return true;
    }

    if (
      requerimiento.tipo === TipoRequerimiento.INTERNO_GERENCIA &&
      ROLES_GERENCIA.includes(user.rolNombre)
    ) {
      return true;
    }

    if (
      requerimiento.tipo === TipoRequerimiento.INTERNO_ADMIN &&
      ROLES_ADMIN.includes(user.rolNombre)
    ) {
      return true;
    }

    return false;
  }

  async create(
    createDto: CreateRequerimientoDto,
    user: UserPayload,
  ): Promise<Requerimiento> {
    const codigo = await this.generarCodigo();

    const requerimiento = this.requerimientosRepository.create({
      ...createDto,
      codigo,
      solicitanteId: user.usuarioId,
      sedeId: createDto.sedeId || user.sedeId,
      fechaEstimada: createDto.fechaEstimada ? new Date(createDto.fechaEstimada) : null,
    });

    return this.requerimientosRepository.save(requerimiento);
  }

  async findAll(
    query: RequerimientosQuery,
    user: UserPayload,
  ): Promise<{ data: Requerimiento[]; total: number; page: number; limit: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Requerimiento> = {};

    if (query.tipo) {
      where.tipo = query.tipo;
    }

    if (query.estado) {
      where.estado = query.estado;
    }

    if (query.prioridad) {
      where.prioridad = query.prioridad;
    }

    if (query.categoria) {
      where.categoria = query.categoria;
    }

    if (query.solicitanteId) {
      where.solicitanteId = query.solicitanteId;
    }

    if (query.asignadoId) {
      where.asignadoId = query.asignadoId;
    }

    if (query.sedeId) {
      where.sedeId = query.sedeId;
    }

    const qb = this.requerimientosRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.solicitante', 'solicitante')
      .leftJoinAndSelect('r.asignado', 'asignado')
      .leftJoinAndSelect('r.sede', 'sede');

    if (query.tipo) {
      qb.andWhere('r.tipo = :tipo', { tipo: query.tipo });
    }

    if (query.estado) {
      qb.andWhere('r.estado = :estado', { estado: query.estado });
    }

    if (query.prioridad) {
      qb.andWhere('r.prioridad = :prioridad', { prioridad: query.prioridad });
    }

    if (query.categoria) {
      qb.andWhere('r.categoria = :categoria', { categoria: query.categoria });
    }

    if (query.solicitanteId) {
      qb.andWhere('r.solicitanteId = :solicitanteId', { solicitanteId: query.solicitanteId });
    }

    if (query.asignadoId) {
      qb.andWhere('r.asignadoId = :asignadoId', { asignadoId: query.asignadoId });
    }

    if (query.sedeId) {
      qb.andWhere('r.sedeId = :sedeId', { sedeId: query.sedeId });
    }

    if (query.busqueda) {
      qb.andWhere('(r.titulo LIKE :busqueda OR r.codigo LIKE :busqueda OR r.descripcion LIKE :busqueda)', {
        busqueda: `%${query.busqueda}%`,
      });
    }

    if (!ROLES_DESARROLLO.includes(user.rolNombre)) {
      if (ROLES_GERENCIA.includes(user.rolNombre)) {
        qb.andWhere(
          '(r.solicitanteId = :userId OR r.asignadoId = :userId OR r.tipo IN (:...tiposGerencia))',
          {
            userId: user.usuarioId,
            tiposGerencia: [
              TipoRequerimiento.INTERNO_GERENCIA,
              TipoRequerimiento.INTERNO_ADMIN,
            ],
          },
        );
      } else if (ROLES_ADMIN.includes(user.rolNombre)) {
        qb.andWhere(
          '(r.solicitanteId = :userId OR r.asignadoId = :userId OR (r.tipo = :tipoAdmin AND r.sedeId = :userSedeId))',
          {
            userId: user.usuarioId,
            tipoAdmin: TipoRequerimiento.INTERNO_ADMIN,
            userSedeId: user.sedeId,
          },
        );
      } else {
        qb.andWhere('(r.solicitanteId = :userId OR r.asignadoId = :userId)', {
          userId: user.usuarioId,
        });
      }
    }

    qb.orderBy('r.prioridad', 'ASC')
      .addOrderBy('r.fechaCreacion', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: number, user: UserPayload): Promise<Requerimiento> {
    const requerimiento = await this.requerimientosRepository.findOne({
      where: { requerimientoId: id },
      relations: ['solicitante', 'asignado', 'sede'],
    });

    if (!requerimiento) {
      throw new NotFoundException(`Requerimiento #${id} no encontrado`);
    }

    if (!this.puedeVerRequerimiento(user, requerimiento)) {
      throw new ForbiddenException('No tienes permiso para ver este requerimiento');
    }

    return requerimiento;
  }

  async findByCodigo(codigo: string, user: UserPayload): Promise<Requerimiento> {
    const requerimiento = await this.requerimientosRepository.findOne({
      where: { codigo },
      relations: ['solicitante', 'asignado', 'sede'],
    });

    if (!requerimiento) {
      throw new NotFoundException(`Requerimiento ${codigo} no encontrado`);
    }

    if (!this.puedeVerRequerimiento(user, requerimiento)) {
      throw new ForbiddenException('No tienes permiso para ver este requerimiento');
    }

    return requerimiento;
  }

  async update(
    id: number,
    updateDto: UpdateRequerimientoDto,
    user: UserPayload,
  ): Promise<Requerimiento> {
    const requerimiento = await this.requerimientosRepository.findOne({
      where: { requerimientoId: id },
    });

    if (!requerimiento) {
      throw new NotFoundException(`Requerimiento #${id} no encontrado`);
    }

    if (!this.puedeEditarRequerimiento(user, requerimiento)) {
      throw new ForbiddenException('No tienes permiso para editar este requerimiento');
    }

    if (updateDto.asignadoId && updateDto.asignadoId !== requerimiento.asignadoId) {
      requerimiento.fechaAsignacion = new Date();
    }

    if (
      updateDto.estado &&
      [EstadoRequerimiento.COMPLETADO, EstadoRequerimiento.RECHAZADO].includes(updateDto.estado) &&
      ![EstadoRequerimiento.COMPLETADO, EstadoRequerimiento.RECHAZADO].includes(requerimiento.estado)
    ) {
      requerimiento.fechaResolucion = new Date();
    }

    if (updateDto.fechaEstimada) {
      requerimiento.fechaEstimada = new Date(updateDto.fechaEstimada);
      delete (updateDto as any).fechaEstimada;
    }

    Object.assign(requerimiento, updateDto);

    return this.requerimientosRepository.save(requerimiento);
  }

  async cambiarEstado(
    id: number,
    estado: EstadoRequerimiento,
    user: UserPayload,
    respuesta?: string,
    publicarCambio?: boolean,
  ): Promise<Requerimiento> {
    const requerimiento = await this.requerimientosRepository.findOne({
      where: { requerimientoId: id },
    });

    if (!requerimiento) {
      throw new NotFoundException(`Requerimiento #${id} no encontrado`);
    }

    if (!this.puedeEditarRequerimiento(user, requerimiento)) {
      throw new ForbiddenException('No tienes permiso para cambiar el estado de este requerimiento');
    }

    requerimiento.estado = estado;

    if (respuesta) {
      requerimiento.respuesta = respuesta;
    }

    if (publicarCambio !== undefined) {
      requerimiento.publicarCambio = publicarCambio;
    }

    if ([EstadoRequerimiento.COMPLETADO, EstadoRequerimiento.RECHAZADO].includes(estado)) {
      requerimiento.fechaResolucion = new Date();

      if (estado === EstadoRequerimiento.COMPLETADO && requerimiento.publicarCambio && !requerimiento.cambioPublicado) {
        const tipoNovedad = this.mapearTipoRequerimientoANovedad(requerimiento.tipo);
        
        await this.novedadesSistemaService.crearDesdeRequerimiento(
          requerimiento.requerimientoId,
          requerimiento.titulo,
          requerimiento.descripcion,
          respuesta || '',
          tipoNovedad,
          user.usuarioId,
        );
        
        requerimiento.cambioPublicado = true;
      }
    }

    return this.requerimientosRepository.save(requerimiento);
  }

  private mapearTipoRequerimientoANovedad(tipo: TipoRequerimiento): TipoNovedad {
    switch (tipo) {
      case TipoRequerimiento.DESARROLLO:
        return TipoNovedad.NUEVA_FUNCIONALIDAD;
      case TipoRequerimiento.BUG:
        return TipoNovedad.CORRECCION;
      case TipoRequerimiento.MEJORA:
        return TipoNovedad.MEJORA;
      default:
        return TipoNovedad.ACTUALIZACION;
    }
  }

  async asignar(id: number, asignadoId: number, user: UserPayload): Promise<Requerimiento> {
    const requerimiento = await this.requerimientosRepository.findOne({
      where: { requerimientoId: id },
    });

    if (!requerimiento) {
      throw new NotFoundException(`Requerimiento #${id} no encontrado`);
    }

    if (!ROLES_ADMIN.includes(user.rolNombre) && !ROLES_DESARROLLO.includes(user.rolNombre)) {
      throw new ForbiddenException('No tienes permiso para asignar requerimientos');
    }

    requerimiento.asignadoId = asignadoId;
    requerimiento.fechaAsignacion = new Date();

    if (requerimiento.estado === EstadoRequerimiento.PENDIENTE) {
      requerimiento.estado = EstadoRequerimiento.EN_REVISION;
    }

    return this.requerimientosRepository.save(requerimiento);
  }

  async remove(id: number, user: UserPayload): Promise<void> {
    const requerimiento = await this.requerimientosRepository.findOne({
      where: { requerimientoId: id },
    });

    if (!requerimiento) {
      throw new NotFoundException(`Requerimiento #${id} no encontrado`);
    }

    if (!ROLES_DESARROLLO.includes(user.rolNombre)) {
      if (
        requerimiento.solicitanteId !== user.usuarioId ||
        requerimiento.estado !== EstadoRequerimiento.PENDIENTE
      ) {
        throw new ForbiddenException('No tienes permiso para eliminar este requerimiento');
      }
    }

    await this.requerimientosRepository.remove(requerimiento);
  }

  async getMisRequerimientos(
    user: UserPayload,
    query: RequerimientosQuery,
  ): Promise<{ data: Requerimiento[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.requerimientosRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.asignado', 'asignado')
      .leftJoinAndSelect('r.sede', 'sede')
      .where('r.solicitanteId = :userId', { userId: user.usuarioId });

    if (query.estado) {
      qb.andWhere('r.estado = :estado', { estado: query.estado });
    }

    qb.orderBy('r.fechaCreacion', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async getAsignadosAMi(
    user: UserPayload,
    query: RequerimientosQuery,
  ): Promise<{ data: Requerimiento[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.requerimientosRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.solicitante', 'solicitante')
      .leftJoinAndSelect('r.sede', 'sede')
      .where('r.asignadoId = :userId', { userId: user.usuarioId });

    if (query.estado) {
      qb.andWhere('r.estado = :estado', { estado: query.estado });
    }

    qb.orderBy('r.prioridad', 'ASC')
      .addOrderBy('r.fechaCreacion', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async getEstadisticas(user: UserPayload): Promise<any> {
    const qb = this.requerimientosRepository.createQueryBuilder('r');

    if (!ROLES_DESARROLLO.includes(user.rolNombre)) {
      qb.where('r.solicitanteId = :userId OR r.asignadoId = :userId', {
        userId: user.usuarioId,
      });
    }

    const porEstado = await this.requerimientosRepository
      .createQueryBuilder('r')
      .select('r.estado', 'estado')
      .addSelect('COUNT(*)', 'cantidad')
      .groupBy('r.estado')
      .getRawMany();

    const porTipo = await this.requerimientosRepository
      .createQueryBuilder('r')
      .select('r.tipo', 'tipo')
      .addSelect('COUNT(*)', 'cantidad')
      .groupBy('r.tipo')
      .getRawMany();

    const porPrioridad = await this.requerimientosRepository
      .createQueryBuilder('r')
      .select('r.prioridad', 'prioridad')
      .addSelect('COUNT(*)', 'cantidad')
      .groupBy('r.prioridad')
      .getRawMany();

    return {
      porEstado,
      porTipo,
      porPrioridad,
    };
  }
}
