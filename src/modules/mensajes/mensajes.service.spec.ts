import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MensajesService } from './mensajes.service';
import { Mensaje } from './mensaje.entity';
import { ChatGateway } from '../chat/chat.gateway';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { UsuariosGruposService } from '../usuarios-grupos/usuarios-grupos.service';
import { UsersService } from '../users/users.service';
import { GruposService } from '../grupos/grupos.service';

describe('MensajesService', () => {
  let service: MensajesService;
  let _repository: Repository<Mensaje>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    query: jest.fn(),
  };

  const mockChatGateway = {
    emitirMensajeNuevo: jest.fn(),
  };
  const mockNotificacionesService = {
    crearNotificacionMensajeNuevo: jest.fn().mockResolvedValue(undefined),
  };
  const mockUsuariosGruposService = {
    findByGrupo: jest.fn().mockResolvedValue([]),
  };
  const mockUsersService = {
    findOne: jest.fn(),
  };
  const mockGruposService = {
    obtenerGrupoPorId: jest.fn().mockResolvedValue({ grupoId: 1, grupoActivo: true }),
  };

  beforeEach(async () => {
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
          useValue: mockUsuariosGruposService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: GruposService,
          useValue: mockGruposService,
        },
      ],
    }).compile();

    service = module.get<MensajesService>(MensajesService);
    _repository = module.get<Repository<Mensaje>>(getRepositoryToken(Mensaje));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enviarMensaje', () => {
    it('should create and save a message', async () => {
      const mockUsuario = {
        usuarioId: 1,
        usuarioEstado: true,
      };
      const mockMensaje = {
        mensajeId: 1,
        grupoId: 1,
        usuarioId: 1,
        mensajeTexto: 'Test message',
      };
      const mockMensajeConRelaciones = {
        ...mockMensaje,
        usuario: mockUsuario,
        grupo: { grupoId: 1, grupoNombre: 'Test Group' },
      };
      mockUsersService.findOne.mockResolvedValue(mockUsuario);
      mockRepository.create.mockReturnValue(mockMensaje);
      mockRepository.save.mockResolvedValue(mockMensaje);
      mockRepository.findOne.mockResolvedValue(mockMensajeConRelaciones);
      mockRepository.query.mockResolvedValue([]);

      const result = await service.enviarMensaje(1, 1, 'Test message');

      expect(result).toEqual(mockMensajeConRelaciones);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(1);
      expect(mockRepository.create).toHaveBeenCalledWith({
        grupoId: 1,
        usuarioId: 1,
        mensajeTexto: 'Test message',
        mensajeRespuestaId: undefined,
      });
    });
  });

  describe('editarMensaje', () => {
    it('should edit message successfully', async () => {
      const mockMensaje = {
        mensajeId: 1,
        usuarioId: 1,
        mensajeTexto: 'Old text',
        mensajeEditado: false,
      };
      mockRepository.findOne.mockResolvedValue(mockMensaje);
      mockRepository.save.mockResolvedValue({
        ...mockMensaje,
        mensajeTexto: 'New text',
        mensajeEditado: true,
      });

      const result = await service.editarMensaje(1, 'New text', 1);

      expect(result.mensajeTexto).toBe('New text');
      expect(result.mensajeEditado).toBe(true);
    });
  });
});
