import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificacionesService } from './notificaciones.service';
import { Notificacion, TipoNotificacion } from './notificacion.entity';
import { ChatGateway } from '../chat/chat.gateway';

describe('NotificacionesService - Notificaciones de Instalaciones', () => {
  let service: NotificacionesService;
  let mockRepository: any;
  let mockChatGateway: any;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    mockChatGateway = {
      emitirNotificacion: jest.fn(),
      emitirEventoInstalacion: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificacionesService,
        {
          provide: getRepositoryToken(Notificacion),
          useValue: mockRepository,
        },
        {
          provide: ChatGateway,
          useValue: mockChatGateway,
        },
      ],
    }).compile();

    service = module.get<NotificacionesService>(NotificacionesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('crearNotificacionInstalacionConstruccion', () => {
    it('should create construction notification', async () => {
      const notificacion = {
        notificacionId: 1,
        usuarioId: 1,
        tipoNotificacion: TipoNotificacion.INSTALACION_CONSTRUCCION,
        titulo: 'Instalación en Construcción',
        contenido: 'La instalación INST-001 para el cliente Test Client está en construcción.',
        datosAdicionales: {
          instalacionId: 1,
          instalacionCodigo: 'INST-001',
          clienteNombre: 'Test Client',
        },
      };

      mockRepository.create.mockReturnValue(notificacion);
      mockRepository.save.mockResolvedValue(notificacion);

      const result = await service.crearNotificacionInstalacionConstruccion(
        1, // tecnicoId
        1, // instalacionId
        'INST-001', // instalacionCodigo
        'Test Client', // clienteNombre
      );

      expect(result.tipoNotificacion).toBe(TipoNotificacion.INSTALACION_CONSTRUCCION);
      expect(result.titulo).toBe('Instalación en Construcción');
      expect(result.contenido).toContain('construcción');
    });
  });

  describe('crearNotificacionInstalacionCertificacion', () => {
    it('should create certification notification', async () => {
      const notificacion = {
        notificacionId: 1,
        usuarioId: 1,
        tipoNotificacion: TipoNotificacion.INSTALACION_CERTIFICACION,
        titulo: 'Instalación en Certificación',
        contenido:
          'La instalación INST-001 para el cliente Test Client está en proceso de certificación.',
        datosAdicionales: {
          instalacionId: 1,
          instalacionCodigo: 'INST-001',
          clienteNombre: 'Test Client',
        },
      };

      mockRepository.create.mockReturnValue(notificacion);
      mockRepository.save.mockResolvedValue(notificacion);

      const result = await service.crearNotificacionInstalacionCertificacion(
        1,
        1,
        'INST-001',
        'Test Client',
      );

      expect(result.tipoNotificacion).toBe(TipoNotificacion.INSTALACION_CERTIFICACION);
      expect(result.contenido).toContain('certificación');
    });
  });

  describe('crearNotificacionInstalacionAnulada', () => {
    it('should create cancelled notification with motivo', async () => {
      const notificacion = {
        notificacionId: 1,
        usuarioId: 1,
        tipoNotificacion: TipoNotificacion.INSTALACION_ANULADA,
        titulo: 'Instalación Anulada',
        contenido:
          'La instalación INST-001 para el cliente Test Client ha sido anulada. Motivo: Test motivo.',
        datosAdicionales: {
          instalacionId: 1,
          instalacionCodigo: 'INST-001',
          clienteNombre: 'Test Client',
          motivo: 'Test motivo',
        },
      };

      mockRepository.create.mockReturnValue(notificacion);
      mockRepository.save.mockResolvedValue(notificacion);

      const result = await service.crearNotificacionInstalacionAnulada(
        1,
        1,
        'INST-001',
        'Test Client',
        'Test motivo',
      );

      expect(result.tipoNotificacion).toBe(TipoNotificacion.INSTALACION_ANULADA);
      expect(result.contenido).toContain('Test motivo');
    });

    it('should create cancelled notification without motivo', async () => {
      const notificacion = {
        notificacionId: 1,
        usuarioId: 1,
        tipoNotificacion: TipoNotificacion.INSTALACION_ANULADA,
        contenido: 'La instalación INST-001 para el cliente Test Client ha sido anulada.',
      };

      mockRepository.create.mockReturnValue(notificacion);
      mockRepository.save.mockResolvedValue(notificacion);

      const result = await service.crearNotificacionInstalacionAnulada(
        1,
        1,
        'INST-001',
        'Test Client',
      );

      expect(result.contenido).not.toContain('Motivo:');
    });
  });

  describe('crearNotificacionMaterialesAsignados', () => {
    it('should create notification without bodega name', async () => {
      const notificacion = {
        notificacionId: 1,
        usuarioId: 1,
        tipoNotificacion: TipoNotificacion.MATERIALES_ASIGNADOS,
        contenido: 'Se te ha asignado 1 material por Admin User.',
        datosAdicionales: {
          asignacionCodigo: 'ASG-001',
          cantidadMateriales: 1,
          asignadorNombre: 'Admin User',
        },
      };

      mockRepository.create.mockReturnValue(notificacion);
      mockRepository.save.mockResolvedValue(notificacion);

      const result = await service.crearNotificacionMaterialesAsignados(
        1,
        'ASG-001',
        1,
        'Admin User',
      );

      expect(result.contenido).not.toContain('desde');
    });
  });
});
