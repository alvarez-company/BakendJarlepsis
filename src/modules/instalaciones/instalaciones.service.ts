import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Instalacion, EstadoInstalacion } from './instalacion.entity';
import { CreateInstalacionDto } from './dto/create-instalacion.dto';
import { UpdateInstalacionDto } from './dto/update-instalacion.dto';
import { ChatGateway } from '../chat/chat.gateway';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { InstalacionesUsuariosService } from '../instalaciones-usuarios/instalaciones-usuarios.service';
import { MovimientosService } from '../movimientos/movimientos.service';
import { MaterialesService } from '../materiales/materiales.service';
import { InventariosService } from '../inventarios/inventarios.service';
import { TipoMovimiento } from '../movimientos/movimiento-inventario.entity';

@Injectable()
export class InstalacionesService {
  constructor(
    @InjectRepository(Instalacion)
    private instalacionesRepository: Repository<Instalacion>,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
    @Inject(forwardRef(() => NotificacionesService))
    private notificacionesService: NotificacionesService,
    @Inject(forwardRef(() => InstalacionesUsuariosService))
    private instalacionesUsuariosService: InstalacionesUsuariosService,
    @Inject(forwardRef(() => MovimientosService))
    private movimientosService: MovimientosService,
    @Inject(forwardRef(() => MaterialesService))
    private materialesService: MaterialesService,
    @Inject(forwardRef(() => InventariosService))
    private inventariosService: InventariosService,
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
    if (nuevoEstado === EstadoInstalacion.COMPLETADA || nuevoEstado === EstadoInstalacion.FINALIZADA) {
      // Actualizar materiales cuando la instalación se completa o finaliza
      // Solo actualizar si el estado anterior no era COMPLETADA o FINALIZADA para evitar duplicados
      if (estadoAnterior !== EstadoInstalacion.COMPLETADA && estadoAnterior !== EstadoInstalacion.FINALIZADA) {
        await this.actualizarMaterialesInstalacion(instalacionId);
      }

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

  private async actualizarMaterialesInstalacion(instalacionId: number): Promise<void> {
    // Obtener todos los movimientos asociados a esta instalación
    const movimientos = await this.movimientosService.findByInstalacion(instalacionId);

    // Para cada movimiento de tipo SALIDA, actualizar el material
    for (const movimiento of movimientos) {
      if (movimiento.movimientoTipo === TipoMovimiento.SALIDA) {
        // Obtener el material
        const material = await this.materialesService.findOne(movimiento.materialId);
        
        // Si el material tiene un inventario asociado, actualizar precio si viene en el movimiento
        if (material.inventarioId && movimiento.movimientoPrecioUnitario) {
          await this.materialesService.actualizarInventarioYPrecio(
            movimiento.materialId,
            material.inventarioId, // Mantener el inventarioId actual
            movimiento.movimientoPrecioUnitario, // Actualizar el precio
          );
        }
      }
    }
  }
}
