import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger(ChatGateway.name);
  private users: Map<number, string> = new Map(); // userId -> socketId

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        this.logger.warn('Conexión rechazada: sin token');
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.usuarioId;

      if (!userId) {
        this.logger.warn('Conexión rechazada: token inválido');
        client.disconnect();
        return;
      }

      // Guardar la conexión del usuario
      this.users.set(userId, client.id);
      (client as any).userId = userId;

      // Notificar que el usuario está en línea
      this.server.emit('usuario_conectado', { userId });

      this.logger.log(`Usuario conectado: ${userId} (socket: ${client.id})`);
    } catch (error) {
      this.logger.error(`Error en conexión: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId;
    
    if (userId) {
      this.users.delete(userId);
      this.server.emit('usuario_desconectado', { userId });
      this.logger.log(`Usuario desconectado: ${userId}`);
    }
  }

  @SubscribeMessage('unirse_grupo')
  async handleUnirseGrupo(@ConnectedSocket() client: Socket, @MessageBody() data: { grupoId: number }) {
    const userId = (client as any).userId;
    const roomName = `grupo_${data.grupoId}`;

    await client.join(roomName);
    this.logger.log(`Usuario ${userId} se unió al grupo ${data.grupoId}`);

    return {
      event: 'grupo_unido',
      data: { grupoId: data.grupoId },
    };
  }

  @SubscribeMessage('salir_grupo')
  async handleSalirGrupo(@ConnectedSocket() client: Socket, @MessageBody() data: { grupoId: number }) {
    const userId = (client as any).userId;
    const roomName = `grupo_${data.grupoId}`;

    await client.leave(roomName);
    this.logger.log(`Usuario ${userId} salió del grupo ${data.grupoId}`);

    return {
      event: 'grupo_abandonado',
      data: { grupoId: data.grupoId },
    };
  }

  // Métodos públicos para emitir eventos desde otros servicios
  emitirMensajeNuevo(grupoId: number, mensaje: any) {
    this.server.to(`grupo_${grupoId}`).emit('mensaje_nuevo', mensaje);
    this.logger.log(`Mensaje nuevo emitido al grupo ${grupoId}`);
  }

  emitirReaccionMensaje(grupoId: number, reaccion: any) {
    this.server.to(`grupo_${grupoId}`).emit('reaccion_mensaje', reaccion);
  }

  emitirNotificacion(usuarioId: number, notificacion: any) {
    const socketId = this.users.get(usuarioId);
    if (socketId) {
      this.server.to(socketId).emit('notificacion_nueva', notificacion);
      this.logger.log(`Notificación enviada al usuario ${usuarioId}`);
    }
  }

  emitirEventoInstalacion(usuariosIds: number[], evento: string, datos: any) {
    usuariosIds.forEach((userId) => {
      const socketId = this.users.get(userId);
      if (socketId) {
        this.server.to(socketId).emit(evento, datos);
      }
    });
  }

  obtenerUsuariosConectados(): number[] {
    return Array.from(this.users.keys());
  }
}

