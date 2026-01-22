import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notificacion, TipoNotificacion } from './notificacion.entity';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class NotificacionesService {
  constructor(
    @InjectRepository(Notificacion)
    private notificacionesRepository: Repository<Notificacion>,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
  ) {}

  async crearNotificacion(
    usuarioId: number,
    tipo: TipoNotificacion,
    titulo: string,
    contenido: string,
    datosAdicionales?: any,
    emitirSocket: boolean = true,
  ): Promise<Notificacion> {
    try {
      const notificacion = this.notificacionesRepository.create({
        usuarioId,
        tipoNotificacion: tipo,
        titulo,
        contenido,
        datosAdicionales,
        grupoId: datosAdicionales?.grupoId,
        instalacionId: datosAdicionales?.instalacionId,
        mensajeId: datosAdicionales?.mensajeId,
      });

      const saved = await this.notificacionesRepository.save(notificacion);

      // Emitir notificación por WebSocket si está habilitado
      if (emitirSocket) {
        try {
          this.chatGateway.emitirNotificacion(usuarioId, saved);
        } catch (wsError) {
          console.error(
            `[NotificacionesService] Error al emitir notificación por WebSocket:`,
            wsError,
          );
          // No lanzar error, la notificación ya se guardó en la BD
        }
      }

      return saved;
    } catch (error) {
      console.error(`[NotificacionesService] ❌ Error al crear notificación:`, error);
      console.error(`[NotificacionesService] Stack trace:`, error.stack);
      throw error;
    }
  }

  async crearNotificacionInstalacionCompletada(
    tecnicoId: number,
    instalacionId: number,
    instalacionCodigo: string,
    clienteNombre: string,
  ): Promise<Notificacion> {
    return this.crearNotificacion(
      tecnicoId,
      TipoNotificacion.INSTALACION_COMPLETADA,
      'Instalación Completada',
      `La instalación ${instalacionCodigo} para el cliente ${clienteNombre} ha sido completada exitosamente.`,
      {
        instalacionId,
        instalacionCodigo,
        clienteNombre,
      },
    );
  }

  async crearNotificacionInstalacionAsignada(
    tecnicoId: number,
    instalacionId: number,
    instalacionCodigo: string,
    clienteNombre: string,
    supervisorNombre: string,
  ): Promise<Notificacion> {
    return this.crearNotificacion(
      tecnicoId,
      TipoNotificacion.INSTALACION_ASIGNADA,
      'Nueva Instalación Asignada',
      `Se te ha asignado la instalación ${instalacionCodigo} para el cliente ${clienteNombre} por ${supervisorNombre}.`,
      {
        instalacionId,
        instalacionCodigo,
        clienteNombre,
        supervisorNombre,
      },
    );
  }

  async crearNotificacionInstalacionAsignacion(
    tecnicoId: number,
    instalacionId: number,
    instalacionCodigo: string,
    clienteNombre: string,
  ): Promise<Notificacion> {
    return this.crearNotificacion(
      tecnicoId,
      TipoNotificacion.INSTALACION_ASIGNACION,
      'Instalación en Asignación',
      `La instalación ${instalacionCodigo} para el cliente ${clienteNombre} está en estado de asignación.`,
      {
        instalacionId,
        instalacionCodigo,
        clienteNombre,
      },
    );
  }

  async crearNotificacionInstalacionConstruccion(
    tecnicoId: number,
    instalacionId: number,
    instalacionCodigo: string,
    clienteNombre: string,
  ): Promise<Notificacion> {
    return this.crearNotificacion(
      tecnicoId,
      TipoNotificacion.INSTALACION_CONSTRUCCION,
      'Instalación en Construcción',
      `La instalación ${instalacionCodigo} para el cliente ${clienteNombre} está en construcción.`,
      {
        instalacionId,
        instalacionCodigo,
        clienteNombre,
      },
    );
  }

  async crearNotificacionInstalacionCertificacion(
    tecnicoId: number,
    instalacionId: number,
    instalacionCodigo: string,
    clienteNombre: string,
  ): Promise<Notificacion> {
    return this.crearNotificacion(
      tecnicoId,
      TipoNotificacion.INSTALACION_CERTIFICACION,
      'Instalación en Certificación',
      `La instalación ${instalacionCodigo} para el cliente ${clienteNombre} está en proceso de certificación.`,
      {
        instalacionId,
        instalacionCodigo,
        clienteNombre,
      },
    );
  }

  async crearNotificacionInstalacionNovedad(
    tecnicoId: number,
    instalacionId: number,
    instalacionCodigo: string,
    clienteNombre: string,
    motivo?: string,
  ): Promise<Notificacion> {
    const contenido = motivo
      ? `La instalación ${instalacionCodigo} para el cliente ${clienteNombre} tiene una novedad técnica: ${motivo}.`
      : `La instalación ${instalacionCodigo} para el cliente ${clienteNombre} tiene una novedad técnica.`;

    return this.crearNotificacion(
      tecnicoId,
      TipoNotificacion.INSTALACION_NOVEDAD,
      'Novedad Técnica en Instalación',
      contenido,
      {
        instalacionId,
        instalacionCodigo,
        clienteNombre,
        motivo,
      },
    );
  }

  async crearNotificacionInstalacionAnulada(
    tecnicoId: number,
    instalacionId: number,
    instalacionCodigo: string,
    clienteNombre: string,
    motivo?: string,
  ): Promise<Notificacion> {
    const contenido = motivo
      ? `La instalación ${instalacionCodigo} para el cliente ${clienteNombre} ha sido anulada. Motivo: ${motivo}.`
      : `La instalación ${instalacionCodigo} para el cliente ${clienteNombre} ha sido anulada.`;

    return this.crearNotificacion(
      tecnicoId,
      TipoNotificacion.INSTALACION_ANULADA,
      'Instalación Anulada',
      contenido,
      {
        instalacionId,
        instalacionCodigo,
        clienteNombre,
        motivo,
      },
    );
  }

  async crearNotificacionMaterialesAsignados(
    tecnicoId: number,
    asignacionCodigo: string,
    cantidadMateriales: number,
    asignadorNombre: string,
    bodegaNombre?: string,
  ): Promise<Notificacion> {
    const mensaje =
      cantidadMateriales === 1
        ? `Se te ha asignado 1 material${bodegaNombre ? ` desde ${bodegaNombre}` : ''} por ${asignadorNombre}.`
        : `Se te han asignado ${cantidadMateriales} materiales${bodegaNombre ? ` desde ${bodegaNombre}` : ''} por ${asignadorNombre}.`;

    return this.crearNotificacion(
      tecnicoId,
      TipoNotificacion.MATERIALES_ASIGNADOS,
      'Nuevos Materiales Asignados',
      mensaje,
      {
        asignacionCodigo,
        cantidadMateriales,
        asignadorNombre,
        bodegaNombre,
      },
    );
  }

  async crearNotificacionMensajeNuevo(
    usuariosIds: number[],
    grupoId: number,
    grupoNombre: string,
    mensajeId: number,
    remitenteNombre: string,
  ): Promise<Notificacion[]> {
    // Crear notificación para todos los usuarios del grupo excepto el remitente
    const notificaciones: Notificacion[] = [];

    for (const usuarioId of usuariosIds) {
      // emitirSocket=true para que se emita automáticamente por socket
      const notificacion = await this.crearNotificacion(
        usuarioId,
        TipoNotificacion.MENSAJE_NUEVO,
        `Nuevo mensaje en ${grupoNombre}`,
        `${remitenteNombre} envió un nuevo mensaje`,
        {
          grupoId,
          grupoNombre,
          mensajeId,
          remitenteNombre,
        },
        true, // emitirSocket
      );
      notificaciones.push(notificacion);
    }

    return notificaciones;
  }

  async obtenerNotificacionesUsuario(
    usuarioId: number,
    limit: number = 50,
    noLeidas?: boolean,
  ): Promise<Notificacion[]> {
    const where: any = { usuarioId };
    if (noLeidas !== undefined) {
      where.leida = !noLeidas;
    }

    return this.notificacionesRepository.find({
      where,
      order: { fechaCreacion: 'DESC' },
      take: limit,
    });
  }

  async marcarComoLeida(notificacionId: number, usuarioId: number): Promise<Notificacion> {
    const notificacion = await this.notificacionesRepository.findOne({
      where: { notificacionId, usuarioId },
    });

    if (!notificacion) {
      throw new Error('Notificación no encontrada');
    }

    // Si ya está leída, no hacer nada
    if (notificacion.leida) {
      return notificacion;
    }

    notificacion.leida = true;
    notificacion.fechaLectura = new Date();

    const notificacionActualizada = await this.notificacionesRepository.save(notificacion);

    // Emitir evento socket para actualizar el contador y la notificación actualizada
    this.chatGateway.emitirNotificacionActualizada(usuarioId, notificacionActualizada);

    return notificacionActualizada;
  }

  async marcarTodasComoLeidas(usuarioId: number): Promise<void> {
    const fechaLectura = new Date();
    await this.notificacionesRepository.update(
      { usuarioId, leida: false },
      { leida: true, fechaLectura },
    );

    // Emitir evento socket para actualizar el contador en el frontend
    this.chatGateway.emitirNotificacionesTodasLeidas(usuarioId);
  }

  async contarNoLeidas(usuarioId: number): Promise<number> {
    return this.notificacionesRepository.count({
      where: { usuarioId, leida: false },
    });
  }

  async contarMensajesNoLeidos(usuarioId: number): Promise<number> {
    try {
      const count = await this.notificacionesRepository.count({
        where: {
          usuarioId,
          leida: false,
          tipoNotificacion: TipoNotificacion.MENSAJE_NUEVO,
        },
      });
      return count;
    } catch (error) {
      console.error('Error al contar mensajes no leídos:', error);
      // Retornar 0 en caso de error para no bloquear la aplicación
      return 0;
    }
  }

  async eliminarNotificacion(notificacionId: number, usuarioId: number): Promise<void> {
    const result = await this.notificacionesRepository.delete({
      notificacionId,
      usuarioId,
    });

    if (result.affected === 0) {
      throw new Error('Notificación no encontrada');
    }
  }

  async obtenerNotificacionesPorGrupo(grupoId: number, usuarioId: number): Promise<Notificacion[]> {
    return this.notificacionesRepository.find({
      where: {
        grupoId,
        usuarioId,
        tipoNotificacion: TipoNotificacion.MENSAJE_NUEVO,
      },
      order: { fechaCreacion: 'DESC' },
    });
  }

  async marcarLeidasPorGrupo(grupoId: number, usuarioId: number): Promise<void> {
    const fechaLectura = new Date();
    await this.notificacionesRepository.update(
      {
        grupoId,
        usuarioId,
        tipoNotificacion: TipoNotificacion.MENSAJE_NUEVO,
        leida: false,
      },
      {
        leida: true,
        fechaLectura,
      },
    );

    // Emitir evento socket para actualizar el contador en el frontend
    this.chatGateway.emitirNotificacionesTodasLeidas(usuarioId);
  }
}
