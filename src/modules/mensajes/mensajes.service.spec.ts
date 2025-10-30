import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MensajesService } from './mensajes.service';
import { Mensaje } from './mensaje.entity';

describe('MensajesService', () => {
  let service: MensajesService;
  let repository: Repository<Mensaje>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MensajesService,
        {
          provide: getRepositoryToken(Mensaje),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<MensajesService>(MensajesService);
    repository = module.get<Repository<Mensaje>>(getRepositoryToken(Mensaje));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enviarMensaje', () => {
    it('should create and save a message', async () => {
      const mockMensaje = {
        mensajeId: 1,
        grupoId: 1,
        usuarioId: 1,
        mensajeTexto: 'Test message',
      };
      mockRepository.create.mockReturnValue(mockMensaje);
      mockRepository.save.mockResolvedValue(mockMensaje);

      const result = await service.enviarMensaje(1, 1, 'Test message');

      expect(result).toEqual(mockMensaje);
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
      mockRepository.save.mockResolvedValue({ ...mockMensaje, mensajeTexto: 'New text', mensajeEditado: true });

      const result = await service.editarMensaje(1, 'New text', 1);

      expect(result.mensajeTexto).toBe('New text');
      expect(result.mensajeEditado).toBe(true);
    });
  });
});

