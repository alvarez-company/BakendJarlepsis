import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mensaje } from './mensaje.entity';
import { ChatGateway } from '../chat/chat.gateway';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { UsuariosGruposService } from '../usuarios-grupos/usuarios-grupos.service';

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
  ) {}

  async enviarMensaje(grupoId: number, usuarioId: number, texto: string, mensajeRespuestaId?: number): Promise<Mensaje> {
    const mensaje = this.mensajesRepository.create({
      grupoId,
      usuarioId,
      mensajeTexto: texto,
      mensajeRespuestaId,
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
    const usuariosParaNotificar = usuariosDelGrupo.filter(id => id !== usuarioId);

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

    return mensajeConRelaciones;
  }

  private async obtenerUsuariosDelGrupo(grupoId: number): Promise<number[]> {
    const resultado = await this.mensajesRepository.query(
      'SELECT DISTINCT usuarioId FROM usuarios_grupos WHERE grupoId = ? AND activo = true',
      [grupoId]
    );
    return resultado.map((row: any) => row.usuarioId);
  }

  async obtenerMensajesGrupo(grupoId: number, limit: number = 50, offset: number = 0): Promise<Mensaje[]> {
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

