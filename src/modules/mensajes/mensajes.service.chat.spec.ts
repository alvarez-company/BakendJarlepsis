import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MensajesService } from './mensajes.service';
import { Mensaje } from './mensaje.entity';
import { ChatGateway } from '../chat/chat.gateway';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { UsuariosGruposService } from '../usuarios-grupos/usuarios-grupos.service';
import { UsersService } from '../users/users.service';
import { GruposService } from '../grupos/grupos.service';

describe('MensajesService - Chat y Notificaciones', () => {
  let service: MensajesService;
  let mockRepository: any;
  let mockChatGateway: any;
  let mockNotificacionesService: any;

  const mockMensaje = {
    mensajeId: 1,
    grupoId: 1,
    usuarioId: 1,
    mensajeTexto: 'Test message',
    fechaCreacion: new Date(),
  };

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      query: jest.fn(),
    };

    mockChatGateway = {
      emitirMensajeNuevo: jest.fn(),
    };

    mockNotificacionesService = {
      crearNotificacionMensajeNuevo: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MensajesService,
        {
          provide: getRepositoryToken(Mensaje),
          useValue: mockRepository,
        },
        {
          provide: ChatGateway,
          useValue: mockChatGateway,
        },
        {
          provide: NotificacionesService,
          useValue: mockNotificacionesService,
        },
        {
          provide: UsuariosGruposService,
          useValue: {},
        },
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn().mockResolvedValue({
              usuarioId: 1,
              usuarioEstado: true,
            }),
          },
        },
        {
          provide: GruposService,
          useValue: {
            obtenerGrupoPorId: jest.fn().mockResolvedValue({
              grupoId: 1,
              grupoActivo: true,
              grupoNombre: 'Test Group',
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MensajesService>(MensajesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enviarMensaje', () => {
    it('should send message and emit to chat gateway', async () => {
      const mensajeConRelaciones = {
        ...mockMensaje,
        usuario: { usuarioId: 1, usuarioNombre: 'Test', usuarioApellido: 'User' },
        grupo: { grupoId: 1, grupoNombre: 'Test Group' },
      };

      mockRepository.create.mockReturnValue(mockMensaje);
      mockRepository.save.mockResolvedValue(mockMensaje);
      mockRepository.findOne.mockResolvedValue(mensajeConRelaciones);
      mockRepository.query.mockResolvedValue([{ usuarioId: 1 }, { usuarioId: 2 }]);
      jest.spyOn(service as any, 'obtenerUsuariosDelGrupo').mockResolvedValue([1, 2]);

      const result = await service.enviarMensaje(1, 1, 'Test message');

      expect(result).toBeDefined();
      expect(mockChatGateway.emitirMensajeNuevo).toHaveBeenCalledWith(1, mensajeConRelaciones);
    });

    it('should create notifications for group members', async () => {
      const mensajeConRelaciones = {
        ...mockMensaje,
        usuario: { usuarioId: 1, usuarioNombre: 'Test', usuarioApellido: 'User' },
        grupo: { grupoId: 1, grupoNombre: 'Test Group' },
      };

      mockRepository.create.mockReturnValue(mockMensaje);
      mockRepository.save.mockResolvedValue(mockMensaje);
      mockRepository.findOne.mockResolvedValue(mensajeConRelaciones);
      jest.spyOn(service as any, 'obtenerUsuariosDelGrupo').mockResolvedValue([2, 3]);
      mockNotificacionesService.crearNotificacionMensajeNuevo.mockResolvedValue([
        { notificacionId: 1 },
        { notificacionId: 2 },
      ]);

      await service.enviarMensaje(1, 1, 'Test message');

      expect(mockNotificacionesService.crearNotificacionMensajeNuevo).toHaveBeenCalledWith(
        [2, 3], // usuariosIds (excluyendo el remitente)
        1, // grupoId
        'Test Group', // grupoNombre
        1, // mensajeId
        'Test User', // remitenteNombre
      );
    });

    it('should not create notification for message sender', async () => {
      const mensajeConRelaciones = {
        ...mockMensaje,
        usuario: { usuarioId: 1, usuarioNombre: 'Test', usuarioApellido: 'User' },
        grupo: { grupoId: 1, grupoNombre: 'Test Group' },
      };

      mockRepository.create.mockReturnValue(mockMensaje);
      mockRepository.save.mockResolvedValue(mockMensaje);
      mockRepository.findOne.mockResolvedValue(mensajeConRelaciones);
      mockRepository.query.mockResolvedValue([{ usuarioId: 1 }, { usuarioId: 2 }]);
      jest.spyOn(service as any, 'obtenerUsuariosDelGrupo').mockResolvedValue([1, 2]);

      await service.enviarMensaje(1, 1, 'Test message');

      // Verificar que se llamó con usuariosIds que no incluyen al remitente (1)
      const callArgs = mockNotificacionesService.crearNotificacionMensajeNuevo.mock.calls[0];
      expect(callArgs[0]).not.toContain(1); // El remitente no debe estar en la lista
    });
  });
});
