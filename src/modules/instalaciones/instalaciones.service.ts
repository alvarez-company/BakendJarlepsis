import { Injectable, NotFoundException, Inject, ForwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Instalacion, EstadoInstalacion } from './instalacion.entity';
import { CreateInstalacionDto } from './dto/create-instalacion.dto';
import { UpdateInstalacionDto } from './dto/update-instalacion.dto';
import { ChatGateway } from '../chat/chat.gateway';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { InstalacionesUsuariosService } from '../instalaciones-usuarios/instalaciones-usuarios.service';

@Injectable()
export class InstalacionesService {
  constructor(
    @InjectRepository(Instalacion)
    private instalacionesRepository: Repository<Instalacion>,
    @Inject(ForwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
    @Inject(ForwardRef(() => NotificacionesService))
    private notificacionesService: NotificacionesService,
    @Inject(ForwardRef(() => InstalacionesUsuariosService))
    private instalacionesUsuariosService: InstalacionesUsuariosService,
  ) {}

  async create(createInstalacionDto: CreateInstalacionDto, usuarioId: number): Promise<Instalacion> {
    const instalacion = this.instalacionesRepository.create({
      ...createInstalacionDto,
      usuarioRegistra: usuarioId,
    });
    return this.instalacionesRepository.save(instalacion);
  }

  async findAll(user?: any): Promise<Instalacion[]> {
    const allInstalaciones = await this.instalacionesRepository.find({
      relations: ['tipoInstalacion', 'cliente'],
    });
    
    // SuperAdmin ve todo
    if (user?.usuarioRol?.rolTipo === 'superadmin' || user?.role === 'superadmin') {
      return allInstalaciones;
    }
    
    // Admin ve instalaciones de su oficina
    if (user?.usuarioRol?.rolTipo === 'admin' || user?.role === 'admin') {
      // Filtrar instalaciones registradas por el admin
      return allInstalaciones.filter(inst => 
        inst.usuarioRegistra === user.usuarioId
      );
    }
    
    // Técnico ve solo sus instalaciones asignadas
    if (user?.usuarioRol?.rolTipo === 'tecnico' || user?.role === 'tecnico') {
      return allInstalaciones.filter(inst => inst.usuarioRegistra === user.usuarioId);
    }
    
    return allInstalaciones;
  }

  async findOne(id: number): Promise<Instalacion> {
    const instalacion = await this.instalacionesRepository.findOne({
      where: { instalacionId: id },
      relations: ['tipoInstalacion', 'cliente', 'movimientos', 'usuariosAsignados'],
    });
    if (!instalacion) {
      throw new NotFoundException(`Instalación con ID ${id} no encontrada`);
    }
    return instalacion;
  }

  async update(id: number, updateInstalacionDto: UpdateInstalacionDto): Promise<Instalacion> {
    const instalacion = await this.findOne(id);
    Object.assign(instalacion, updateInstalacionDto);
    return this.instalacionesRepository.save(instalacion);
  }

  async remove(id: number): Promise<void> {
    const instalacion = await this.findOne(id);
    await this.instalacionesRepository.remove(instalacion);
  }

  async actualizarEstado(instalacionId: number, nuevoEstado: EstadoInstalacion, usuarioId: number): Promise<Instalacion> {
    const instalacion = await this.findOne(instalacionId);
    const estadoAnterior = instalacion.estado;
    instalacion.estado = nuevoEstado;
    
    const instalacionActualizada = await this.instalacionesRepository.save(instalacion);

    // Obtener información del cliente y usuarios asignados
    const instalacionCompleta = await this.instalacionesRepository.findOne({
      where: { instalacionId },
      relations: ['cliente', 'tipoInstalacion', 'usuariosAsignados', 'usuariosAsignados.usuario'],
    });

    // Obtener todos los usuarios asignados a esta instalación
    const usuariosAsignados = await this.instalacionesUsuariosService.findByInstalacion(instalacionId);
    const usuariosIds = usuariosAsignados.map(u => u.usuarioId);

    // Enviar notificaciones según el estado
    if (nuevoEstado === EstadoInstalacion.COMPLETADA) {
      // Notificar al usuario que completó la instalación
      await this.notificacionesService.crearNotificacionInstalacionCompletada(
        usuarioId,
        instalacionId,
        instalacionCompleta.instalacionCodigo,
        instalacionCompleta.cliente?.clienteNombre || 'Cliente',
      );

      // Emitir evento por WebSocket
      this.chatGateway.emitirEventoInstalacion(
        usuariosIds,
        'instalacion_completada',
        {
          instalacionId,
          instalacionCodigo: instalacionCompleta.instalacionCodigo,
          clienteNombre: instalacionCompleta.cliente?.clienteNombre,
          usuarioId,
        },
      );
    } else if (nuevoEstado === EstadoInstalacion.EN_PROCESO) {
      // Notificar a los usuarios asignados
      this.chatGateway.emitirEventoInstalacion(
        usuariosIds.filter(id => id !== usuarioId),
        'instalacion_en_proceso',
        {
          instalacionId,
          instalacionCodigo: instalacionCompleta.instalacionCodigo,
          clienteNombre: instalacionCompleta.cliente?.clienteNombre,
        },
      );
    } else if (nuevoEstado === EstadoInstalacion.CANCELADA) {
      // Notificar a los usuarios asignados
      this.chatGateway.emitirEventoInstalacion(
        usuariosIds,
        'instalacion_cancelada',
        {
          instalacionId,
          instalacionCodigo: instalacionCompleta.instalacionCodigo,
          clienteNombre: instalacionCompleta.cliente?.clienteNombre,
        },
      );
    }

    return instalacionActualizada;
  }
}
