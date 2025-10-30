import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notificacion, TipoNotificacion } from './notificacion.entity';

@Injectable()
export class NotificacionesService {
  constructor(
    @InjectRepository(Notificacion)
    private notificacionesRepository: Repository<Notificacion>,
  ) {}

  async crearNotificacion(
    usuarioId: number,
    tipo: TipoNotificacion,
    titulo: string,
    contenido: string,
    datosAdicionales?: any,
  ): Promise<Notificacion> {
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

    return this.notificacionesRepository.save(notificacion);
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

    notificacion.leida = true;
    notificacion.fechaLectura = new Date();

    return this.notificacionesRepository.save(notificacion);
  }

  async marcarTodasComoLeidas(usuarioId: number): Promise<void> {
    await this.notificacionesRepository.update(
      { usuarioId, leida: false },
      { leida: true, fechaLectura: new Date() },
    );
  }

  async contarNoLeidas(usuarioId: number): Promise<number> {
    return this.notificacionesRepository.count({
      where: { usuarioId, leida: false },
    });
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
}

