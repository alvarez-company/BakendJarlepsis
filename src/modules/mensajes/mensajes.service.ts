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
    const MAX_ADJUNTOS = 10; // Máximo de adjuntos por mensaje
    const MAX_TOTAL_SIZE = 16 * 1024 * 1024; // 16MB total para todos los adjuntos

    let totalSize = 0;
    const adjuntos =
      archivosAdjuntos && archivosAdjuntos.length > 0
        ? archivosAdjuntos.map((a, index) => {
            const str = typeof a === 'string' ? a : (a as { url: string }).url;
            
            // Validar formato base64 si es data URL
            if (str.startsWith('data:')) {
              // Validar formato: data:[tipo];base64,[datos]
              const base64Pattern = /^data:image\/(jpeg|jpg|png|gif|webp|bmp);base64,/i;
              if (!base64Pattern.test(str)) {
                throw new BadRequestException(
                  `El adjunto ${index + 1} no tiene un formato de imagen válido. Solo se permiten imágenes (JPEG, PNG, GIF, WebP, BMP) en formato base64.`,
                );
              }

              // Validar tamaño individual
              if (str.length > MAX_BASE64_PER_ITEM) {
                throw new BadRequestException(
                  `La imagen ${index + 1} supera el tamaño máximo permitido (4MB). Comprime la imagen antes de enviar.`,
                );
              }

              // Validar que el base64 sea válido (al menos tenga datos después del prefijo)
              const base64Data = str.split(',')[1];
              if (!base64Data || base64Data.length === 0) {
                throw new BadRequestException(
                  `La imagen ${index + 1} no contiene datos válidos en formato base64.`,
                );
              }

              // Validar formato base64 (solo caracteres válidos)
              const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
              if (!base64Regex.test(base64Data)) {
                throw new BadRequestException(
                  `La imagen ${index + 1} no tiene un formato base64 válido.`,
                );
              }

              totalSize += str.length;
            }
            
            return str;
          })
        : null;

    // Validar número máximo de adjuntos
    if (adjuntos && adjuntos.length > MAX_ADJUNTOS) {
      throw new BadRequestException(
        `No se pueden enviar más de ${MAX_ADJUNTOS} imágenes por mensaje.`,
      );
    }

    // Validar tamaño total
    if (totalSize > MAX_TOTAL_SIZE) {
      throw new BadRequestException(
        `El tamaño total de las imágenes supera el límite permitido (16MB). Reduce el número de imágenes o comprímelas antes de enviar.`,
      );
    }
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
