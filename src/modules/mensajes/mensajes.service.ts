import { Injectable, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mensaje } from './mensaje.entity';
import { ChatGateway } from '../chat/chat.gateway';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { UsuariosGruposService } from '../usuarios-grupos/usuarios-grupos.service';
import { UsersService } from '../users/users.service';
import { GruposService } from '../grupos/grupos.service';
import { InstalacionesService } from '../instalaciones/instalaciones.service';
import { TipoGrupo } from '../grupos/grupo.entity';

@Injectable()
export class MensajesService {
  constructor(
    @InjectRepository(Mensaje)
    private mensajesRepository: Repository<Mensaje>,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
    @Inject(forwardRef(() => NotificacionesService))
    private notificacionesService: NotificacionesService,
    @Inject(forwardRef(() => UsuariosGruposService))
    private usuariosGruposService: UsuariosGruposService,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    @Inject(forwardRef(() => GruposService))
    private gruposService: GruposService,
    @Inject(forwardRef(() => InstalacionesService))
    private instalacionesService: InstalacionesService,
  ) {}

  async enviarMensaje(
    grupoId: number,
    usuarioId: number,
    texto: string,
    mensajeRespuestaId?: number,
    archivosAdjuntos?: string[] | { url: string }[],
  ): Promise<Mensaje> {
    // Validar que el usuario esté activo (findOneForAuth evita filtros de visibilidad)
    const usuario = await this.usersService.findOneForAuth(usuarioId);
    if (!usuario || !usuario.usuarioEstado) {
      throw new BadRequestException(
        'No puedes enviar mensajes. Tu cuenta está bloqueada o inactiva.',
      );
    }

    // Validar que el grupo esté activo
    const grupo = await this.gruposService.obtenerGrupoPorId(grupoId);
    if (!grupo.grupoActivo) {
      throw new BadRequestException('Este chat ha sido cerrado y ya no permite nuevos mensajes.');
    }
    const tieneTexto = typeof texto === 'string' && texto.trim().length > 0;
    const tieneAdjuntos = archivosAdjuntos && archivosAdjuntos.length > 0;
    if (!tieneTexto && !tieneAdjuntos) {
      throw new BadRequestException('El mensaje debe tener texto o al menos una imagen.');
    }
    // Aceptar URLs (legacy) o data URLs (base64) para no almacenar archivos en el servidor
    const MAX_BASE64_PER_ITEM = 4 * 1024 * 1024; // 4MB por adjunto
    const adjuntos =
      archivosAdjuntos && archivosAdjuntos.length > 0
        ? archivosAdjuntos.map((a) => {
            const str = typeof a === 'string' ? a : (a as { url: string }).url;
            if (str.startsWith('data:') && str.length > MAX_BASE64_PER_ITEM) {
              throw new BadRequestException(
                'Una o más imágenes superan el tamaño máximo permitido (4MB). Comprime la imagen antes de enviar.',
              );
            }
            return str;
          })
        : null;
    const mensaje = this.mensajesRepository.create({
      grupoId,
      usuarioId,
      mensajeTexto: texto || '',
      mensajeRespuestaId,
      archivosAdjuntos: adjuntos,
    });

    const mensajeGuardado = await this.mensajesRepository.save(mensaje);

    // Cargar relaciones para emitir
    const mensajeConRelaciones = await this.mensajesRepository.findOne({
      where: { mensajeId: mensajeGuardado.mensajeId },
      relations: ['usuario', 'mensajeRespuesta', 'reacciones', 'grupo'],
    });

    // Emitir por WebSocket
    this.chatGateway.emitirMensajeNuevo(grupoId, mensajeConRelaciones);

    // Obtener usuarios del grupo para enviar notificaciones
    const usuariosDelGrupo = await this.obtenerUsuariosDelGrupo(grupoId);
    const usuariosParaNotificar = usuariosDelGrupo.filter((id) => id !== usuarioId);

    // Crear notificaciones
    if (usuariosParaNotificar.length > 0) {
      await this.notificacionesService.crearNotificacionMensajeNuevo(
        usuariosParaNotificar,
        grupoId,
        mensajeConRelaciones.grupo?.grupoNombre || 'Grupo',
        mensajeGuardado.mensajeId,
        `${mensajeConRelaciones.usuario?.usuarioNombre} ${mensajeConRelaciones.usuario?.usuarioApellido}`,
      );
    }

    // Si el chat es de una instalación y el mensaje tiene adjuntos (solo URLs de servidor, no base64), registrarlos como anexos
    const adjuntosUrls = adjuntos?.filter((a) => typeof a === 'string' && !a.startsWith('data:'));
    if (adjuntosUrls && adjuntosUrls.length > 0) {
      const grupoInstalacion =
        mensajeConRelaciones.grupo ??
        (await this.gruposService.obtenerGrupoPorId(grupoId).catch(() => null));
      if (
        grupoInstalacion &&
        grupoInstalacion.tipoGrupo === TipoGrupo.INSTALACION &&
        grupoInstalacion.entidadId != null
      ) {
        try {
          await this.instalacionesService.agregarAnexos(grupoInstalacion.entidadId, adjuntosUrls);
        } catch (error) {
          console.error(
            `[MensajesService] Error al registrar anexos en instalación ${grupoInstalacion.entidadId}:`,
            error,
          );
        }
      }
    }

    return mensajeConRelaciones;
  }

  private async obtenerUsuariosDelGrupo(grupoId: number): Promise<number[]> {
    const resultado = await this.mensajesRepository.query(
      'SELECT DISTINCT usuarioId FROM usuarios_grupos WHERE grupoId = ? AND activo = true',
      [grupoId],
    );
    return resultado.map((row: any) => row.usuarioId);
  }

  async obtenerMensajesGrupo(
    grupoId: number,
    limit: number = 50,
    offset: number = 0,
  ): Promise<Mensaje[]> {
    return this.mensajesRepository.find({
      where: { grupoId, mensajeActivo: true },
      relations: ['usuario', 'mensajeRespuesta', 'reacciones'],
      order: { fechaCreacion: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async editarMensaje(mensajeId: number, nuevoTexto: string, usuarioId: number): Promise<Mensaje> {
    const mensaje = await this.mensajesRepository.findOne({ where: { mensajeId, usuarioId } });
    if (!mensaje) throw new Error('Mensaje no encontrado o sin permisos');

    mensaje.mensajeTexto = nuevoTexto;
    mensaje.mensajeEditado = true;
    return this.mensajesRepository.save(mensaje);
  }

  async eliminarMensaje(mensajeId: number, usuarioId: number): Promise<void> {
    const mensaje = await this.mensajesRepository.findOne({ where: { mensajeId, usuarioId } });
    if (!mensaje) throw new Error('Mensaje no encontrado o sin permisos');

    mensaje.mensajeActivo = false;
    await this.mensajesRepository.save(mensaje);
  }

  async obtenerUltimoMensaje(grupoId: number): Promise<Mensaje | null> {
    const mensajes = await this.mensajesRepository.find({
      where: { grupoId, mensajeActivo: true },
      relations: ['usuario'],
      order: { fechaCreacion: 'DESC' },
      take: 1,
    });
    return mensajes.length > 0 ? mensajes[0] : null;
  }
}
