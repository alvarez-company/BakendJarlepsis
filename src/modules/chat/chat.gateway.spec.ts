import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { Server } from 'socket.io';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let jwtService: JwtService;
  let mockServer: any;
  let mockSocket: any;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    const mockJwtService = {
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    jwtService = module.get<JwtService>(JwtService);

    // Mock server
    mockServer = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    };
    gateway.server = mockServer as Server;

    // Mock socket
    mockSocket = {
      id: 'socket-123',
      handshake: {
        auth: {},
        headers: {},
      },
      disconnect: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    (gateway as any).users.clear();
  });

  describe('handleConnection', () => {
    it('should connect user with valid token', async () => {
      const payload = { usuarioId: 1, email: 'test@example.com' };
      mockSocket.handshake.auth = { token: 'valid-token' };
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(payload);

      await gateway.handleConnection(mockSocket);

      expect((gateway as any).users.get(1)).toBe('socket-123');
      expect((mockSocket as any).userId).toBe(1);
      expect(mockServer.emit).toHaveBeenCalledWith('usuario_conectado', { userId: 1 });
    });

    it('should reject connection without token', async () => {
      mockSocket.handshake.auth = {};
      mockSocket.handshake.headers = {};

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect((gateway as any).users.has(1)).toBe(false);
    });

    it('should reject connection with invalid token', async () => {
      mockSocket.handshake.auth = { token: 'invalid-token' };
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should extract token from Authorization header', async () => {
      const payload = { usuarioId: 1 };
      mockSocket.handshake.headers = {
        authorization: 'Bearer valid-token',
      };
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(payload);

      await gateway.handleConnection(mockSocket);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
      expect((gateway as any).users.get(1)).toBe('socket-123');
    });
  });

  describe('handleDisconnect', () => {
    it('should remove user from map and emit disconnect event', () => {
      (gateway as any).users.set(1, 'socket-123');
      mockSocket.userId = 1;

      gateway.handleDisconnect(mockSocket);

      expect((gateway as any).users.has(1)).toBe(false);
      expect(mockServer.emit).toHaveBeenCalledWith('usuario_desconectado', { userId: 1 });
    });

    it('should handle disconnect without userId gracefully', () => {
      mockSocket.userId = undefined;

      gateway.handleDisconnect(mockSocket);

      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });

  describe('handleUnirseGrupo', () => {
    it('should join user to group room', async () => {
      mockSocket.userId = 1;
      const data = { grupoId: 1 };

      const result = await gateway.handleUnirseGrupo(mockSocket, data);

      expect(mockSocket.join).toHaveBeenCalledWith('grupo_1');
      expect(result).toEqual({
        event: 'grupo_unido',
        data: { grupoId: 1 },
      });
    });
  });

  describe('handleSalirGrupo', () => {
    it('should remove user from group room', async () => {
      mockSocket.userId = 1;
      const data = { grupoId: 1 };

      const result = await gateway.handleSalirGrupo(mockSocket, data);

      expect(mockSocket.leave).toHaveBeenCalledWith('grupo_1');
      expect(result).toEqual({
        event: 'grupo_abandonado',
        data: { grupoId: 1 },
      });
    });
  });

  describe('emitirMensajeNuevo', () => {
    it('should emit new message to group', () => {
      const mensaje = { mensajeId: 1, mensajeTexto: 'Test message' };
      mockServer.to.mockReturnValue({
        emit: jest.fn(),
      });

      gateway.emitirMensajeNuevo(1, mensaje);

      expect(mockServer.to).toHaveBeenCalledWith('grupo_1');
    });
  });

  describe('emitirNotificacion', () => {
    it('should emit notification to connected user', () => {
      (gateway as any).users.set(1, 'socket-123');
      const notificacion = { notificacionId: 1, titulo: 'Test' };
      mockServer.to.mockReturnValue({
        emit: jest.fn(),
      });

      gateway.emitirNotificacion(1, notificacion);

      expect(mockServer.to).toHaveBeenCalledWith('socket-123');
    });

    it('should not emit if user is not connected', () => {
      const notificacion = { notificacionId: 1, titulo: 'Test' };

      gateway.emitirNotificacion(999, notificacion);

      expect(mockServer.to).not.toHaveBeenCalled();
    });
  });

  describe('emitirEventoInstalacion', () => {
    it('should emit installation event to multiple users', () => {
      (gateway as any).users.set(1, 'socket-1');
      (gateway as any).users.set(2, 'socket-2');
      (gateway as any).users.set(3, 'socket-3');
      const usuariosIds = [1, 2, 3];
      const datos = { instalacionId: 1 };

      mockServer.to.mockReturnValue({
        emit: jest.fn(),
      });

      gateway.emitirEventoInstalacion(usuariosIds, 'instalacion_actualizada', datos);

      expect(mockServer.to).toHaveBeenCalledTimes(3);
      expect(mockServer.to).toHaveBeenCalledWith('socket-1');
      expect(mockServer.to).toHaveBeenCalledWith('socket-2');
      expect(mockServer.to).toHaveBeenCalledWith('socket-3');
    });

    it('should skip users not connected', () => {
      (gateway as any).users.set(1, 'socket-1');
      const usuariosIds = [1, 999]; // 999 no está conectado
      const datos = { instalacionId: 1 };

      mockServer.to.mockReturnValue({
        emit: jest.fn(),
      });

      gateway.emitirEventoInstalacion(usuariosIds, 'instalacion_actualizada', datos);

      expect(mockServer.to).toHaveBeenCalledTimes(1);
      expect(mockServer.to).toHaveBeenCalledWith('socket-1');
    });
  });

  describe('emitirNotificacionActualizada', () => {
    it('should emit updated notification and read event', () => {
      (gateway as any).users.set(1, 'socket-123');
      const notificacion = { notificacionId: 1, leida: true };
      mockServer.to.mockReturnValue({
        emit: jest.fn(),
      });

      gateway.emitirNotificacionActualizada(1, notificacion);

      expect(mockServer.to).toHaveBeenCalledWith('socket-123');
    });
  });

  describe('emitirNotificacionesTodasLeidas', () => {
    it('should emit all read event', () => {
      (gateway as any).users.set(1, 'socket-123');
      mockServer.to.mockReturnValue({
        emit: jest.fn(),
      });

      gateway.emitirNotificacionesTodasLeidas(1);

      expect(mockServer.to).toHaveBeenCalledWith('socket-123');
    });
  });

  describe('obtenerUsuariosConectados', () => {
    it('should return array of connected user IDs', () => {
      (gateway as any).users.set(1, 'socket-1');
      (gateway as any).users.set(2, 'socket-2');
      (gateway as any).users.set(3, 'socket-3');

      const result = gateway.obtenerUsuariosConectados();

      expect(result).toEqual([1, 2, 3]);
    });

    it('should return empty array when no users connected', () => {
      const result = gateway.obtenerUsuariosConectados();

      expect(result).toEqual([]);
    });
  });

  describe('emitirCierreChat', () => {
    it('should emit chat closed event to multiple users', () => {
      (gateway as any).users.set(1, 'socket-1');
      (gateway as any).users.set(2, 'socket-2');
      const usuariosIds = [1, 2];
      const motivo = 'Instalación completada';

      mockServer.to.mockReturnValue({
        emit: jest.fn(),
      });

      gateway.emitirCierreChat(1, usuariosIds, motivo);

      expect(mockServer.to).toHaveBeenCalledTimes(2);
    });
  });

  describe('emitirMensajeSistema', () => {
    it('should emit system message to group', () => {
      const mensaje = { mensajeId: 1, mensajeTexto: 'System message' };
      mockServer.to.mockReturnValue({
        emit: jest.fn(),
      });

      gateway.emitirMensajeSistema(1, mensaje);

      expect(mockServer.to).toHaveBeenCalledWith('grupo_1');
    });
  });
});
