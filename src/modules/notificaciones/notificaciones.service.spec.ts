import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificacionesService } from './notificaciones.service';
import { Notificacion, TipoNotificacion } from './notificacion.entity';
import { ChatGateway } from '../chat/chat.gateway';

describe('NotificacionesService', () => {
  let service: NotificacionesService;
  let mockRepository: any;
  let mockChatGateway: any;

  const mockNotificacion = {
    notificacionId: 1,
    usuarioId: 1,
    tipoNotificacion: TipoNotificacion.MENSAJE_NUEVO,
    titulo: 'Test Notification',
    contenido: 'Test content',
    datosAdicionales: {},
    leida: false,
    fechaCreacion: new Date(),
  };

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
      emitirNotificacionActualizada: jest.fn(),
      emitirNotificacionesTodasLeidas: jest.fn(),
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

  describe('crearNotificacion', () => {
    it('should create and save a notification', async () => {
      mockRepository.create.mockReturnValue(mockNotificacion);
      mockRepository.save.mockResolvedValue(mockNotificacion);

      const result = await service.crearNotificacion(
        1,
        TipoNotificacion.MENSAJE_NUEVO,
        'Test Notification',
        'Test content',
      );

      expect(result).toEqual(mockNotificacion);
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockChatGateway.emitirNotificacion).toHaveBeenCalledWith(1, mockNotificacion);
    });

    it('should create notification with additional data', async () => {
      const datosAdicionales = {
        grupoId: 1,
        instalacionId: 1,
        mensajeId: 1,
      };
      const notificacionConDatos = {
        ...mockNotificacion,
        grupoId: 1,
        instalacionId: 1,
        mensajeId: 1,
      };

      mockRepository.create.mockReturnValue(notificacionConDatos);
      mockRepository.save.mockResolvedValue(notificacionConDatos);

      const result = await service.crearNotificacion(
        1,
        TipoNotificacion.MENSAJE_NUEVO,
        'Test Notification',
        'Test content',
        datosAdicionales,
      );

      expect(result.grupoId).toBe(1);
      expect(result.instalacionId).toBe(1);
      expect(result.mensajeId).toBe(1);
    });

    it('should not emit socket if emitirSocket is false', async () => {
      mockRepository.create.mockReturnValue(mockNotificacion);
      mockRepository.save.mockResolvedValue(mockNotificacion);

      await service.crearNotificacion(
        1,
        TipoNotificacion.MENSAJE_NUEVO,
        'Test Notification',
        'Test content',
        {},
        false, // emitirSocket = false
      );

      expect(mockChatGateway.emitirNotificacion).not.toHaveBeenCalled();
    });

    it('should handle WebSocket errors gracefully', async () => {
      mockRepository.create.mockReturnValue(mockNotificacion);
      mockRepository.save.mockResolvedValue(mockNotificacion);
      mockChatGateway.emitirNotificacion.mockImplementation(() => {
        throw new Error('WebSocket error');
      });

      // Should not throw, just log error
      const result = await service.crearNotificacion(
        1,
        TipoNotificacion.MENSAJE_NUEVO,
        'Test Notification',
        'Test content',
      );

      expect(result).toEqual(mockNotificacion);
    });
  });

  describe('crearNotificacionInstalacionCompletada', () => {
    it('should create installation completed notification', async () => {
      const notificacion = {
        ...mockNotificacion,
        tipoNotificacion: TipoNotificacion.INSTALACION_COMPLETADA,
        titulo: 'Instalación Completada',
        datosAdicionales: {
          instalacionId: 1,
          instalacionCodigo: 'INST-001',
          clienteNombre: 'Test Client',
        },
      };

      mockRepository.create.mockReturnValue(notificacion);
      mockRepository.save.mockResolvedValue(notificacion);

      const result = await service.crearNotificacionInstalacionCompletada(
        1, // tecnicoId
        1, // instalacionId
        'INST-001', // instalacionCodigo
        'Test Client', // clienteNombre
      );

      expect(result.tipoNotificacion).toBe(TipoNotificacion.INSTALACION_COMPLETADA);
      expect(result.titulo).toBe('Instalación Completada');
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('crearNotificacionInstalacionAsignada', () => {
    it('should create installation assigned notification', async () => {
      const notificacion = {
        ...mockNotificacion,
        tipoNotificacion: TipoNotificacion.INSTALACION_ASIGNADA,
        titulo: 'Nueva Instalación Asignada',
        datosAdicionales: {
          instalacionId: 1,
          instalacionCodigo: 'INST-001',
          clienteNombre: 'Test Client',
          supervisorNombre: 'Supervisor Name',
        },
      };

      mockRepository.create.mockReturnValue(notificacion);
      mockRepository.save.mockResolvedValue(notificacion);

      const result = await service.crearNotificacionInstalacionAsignada(
        1, // tecnicoId
        1, // instalacionId
        'INST-001', // instalacionCodigo
        'Test Client', // clienteNombre
        'Supervisor Name', // supervisorNombre
      );

      expect(result.tipoNotificacion).toBe(TipoNotificacion.INSTALACION_ASIGNADA);
      expect(result.datosAdicionales.supervisorNombre).toBe('Supervisor Name');
    });
  });

  describe('crearNotificacionInstalacionNovedad', () => {
    it('should create installation novedad notification with motivo', async () => {
      const notificacion = {
        ...mockNotificacion,
        tipoNotificacion: TipoNotificacion.INSTALACION_NOVEDAD,
        contenido:
          'La instalación INST-001 para el cliente Test Client tiene una novedad técnica: Test motivo.',
        datosAdicionales: {
          instalacionId: 1,
          instalacionCodigo: 'INST-001',
          clienteNombre: 'Test Client',
          motivo: 'Test motivo',
        },
      };

      mockRepository.create.mockReturnValue(notificacion);
      mockRepository.save.mockResolvedValue(notificacion);

      const result = await service.crearNotificacionInstalacionNovedad(
        1, // tecnicoId
        1, // instalacionId
        'INST-001', // instalacionCodigo
        'Test Client', // clienteNombre
        'Test motivo', // motivo
      );

      expect(result.tipoNotificacion).toBe(TipoNotificacion.INSTALACION_NOVEDAD);
      expect(result.contenido).toContain('Test motivo');
    });

    it('should create installation novedad notification without motivo', async () => {
      const notificacion = {
        ...mockNotificacion,
        tipoNotificacion: TipoNotificacion.INSTALACION_NOVEDAD,
        contenido: 'La instalación INST-001 para el cliente Test Client tiene una novedad técnica.',
      };

      mockRepository.create.mockReturnValue(notificacion);
      mockRepository.save.mockResolvedValue(notificacion);

      const result = await service.crearNotificacionInstalacionNovedad(
        1,
        1,
        'INST-001',
        'Test Client',
      );

      expect(result.contenido).not.toContain('Motivo:');
    });
  });

  describe('crearNotificacionMaterialesAsignados', () => {
    it('should create materials assigned notification for single material', async () => {
      const notificacion = {
        ...mockNotificacion,
        tipoNotificacion: TipoNotificacion.MATERIALES_ASIGNADOS,
        titulo: 'Nuevos Materiales Asignados',
        contenido: 'Se te ha asignado 1 material desde Bodega Test por Admin User.',
        datosAdicionales: {
          asignacionCodigo: 'ASG-001',
          cantidadMateriales: 1,
          asignadorNombre: 'Admin User',
          bodegaNombre: 'Bodega Test',
        },
      };

      mockRepository.create.mockReturnValue(notificacion);
      mockRepository.save.mockResolvedValue(notificacion);

      const result = await service.crearNotificacionMaterialesAsignados(
        1, // tecnicoId
        'ASG-001', // asignacionCodigo
        1, // cantidadMateriales
        'Admin User', // asignadorNombre
        'Bodega Test', // bodegaNombre
      );

      expect(result.tipoNotificacion).toBe(TipoNotificacion.MATERIALES_ASIGNADOS);
      expect(result.contenido).toContain('1 material');
    });

    it('should create materials assigned notification for multiple materials', async () => {
      const notificacion = {
        ...mockNotificacion,
        tipoNotificacion: TipoNotificacion.MATERIALES_ASIGNADOS,
        contenido: 'Se te han asignado 5 materiales desde Bodega Test por Admin User.',
        datosAdicionales: {
          cantidadMateriales: 5,
        },
      };

      mockRepository.create.mockReturnValue(notificacion);
      mockRepository.save.mockResolvedValue(notificacion);

      const result = await service.crearNotificacionMaterialesAsignados(
        1,
        'ASG-001',
        5, // cantidadMateriales > 1
        'Admin User',
        'Bodega Test',
      );

      expect(result.contenido).toContain('5 materiales');
    });
  });

  describe('crearNotificacionMensajeNuevo', () => {
    it('should create notifications for all users in group', async () => {
      const usuariosIds = [1, 2, 3];
      const notificaciones = usuariosIds.map((id) => ({
        ...mockNotificacion,
        notificacionId: id,
        usuarioId: id,
        tipoNotificacion: TipoNotificacion.MENSAJE_NUEVO,
        datosAdicionales: {
          grupoId: 1,
          grupoNombre: 'Test Group',
          mensajeId: 1,
          remitenteNombre: 'Sender Name',
        },
      }));

      mockRepository.create
        .mockReturnValueOnce(notificaciones[0])
        .mockReturnValueOnce(notificaciones[1])
        .mockReturnValueOnce(notificaciones[2]);
      mockRepository.save
        .mockResolvedValueOnce(notificaciones[0])
        .mockResolvedValueOnce(notificaciones[1])
        .mockResolvedValueOnce(notificaciones[2]);

      const result = await service.crearNotificacionMensajeNuevo(
        usuariosIds,
        1, // grupoId
        'Test Group', // grupoNombre
        1, // mensajeId
        'Sender Name', // remitenteNombre
      );

      expect(result).toHaveLength(3);
      expect(mockRepository.save).toHaveBeenCalledTimes(3);
      expect(mockChatGateway.emitirNotificacion).toHaveBeenCalledTimes(3);
    });
  });

  describe('marcarComoLeida', () => {
    it('should mark notification as read', async () => {
      const notificacionNoLeida = {
        ...mockNotificacion,
        leida: false,
        fechaLectura: null,
      };
      const notificacionLeida = {
        ...mockNotificacion,
        leida: true,
        fechaLectura: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(notificacionNoLeida);
      mockRepository.save.mockResolvedValue(notificacionLeida);

      const result = await service.marcarComoLeida(1, 1);

      expect(result.leida).toBe(true);
      expect(result.fechaLectura).toBeDefined();
      expect(mockChatGateway.emitirNotificacionActualizada).toHaveBeenCalledWith(
        1,
        notificacionLeida,
      );
    });

    it('should return notification if already read', async () => {
      const notificacionLeida = {
        ...mockNotificacion,
        leida: true,
        fechaLectura: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(notificacionLeida);

      const result = await service.marcarComoLeida(1, 1);

      expect(result).toEqual(notificacionLeida);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error if notification not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.marcarComoLeida(1, 1)).rejects.toThrow('Notificación no encontrada');
    });
  });

  describe('marcarTodasComoLeidas', () => {
    it('should mark all notifications as read', async () => {
      mockRepository.update.mockResolvedValue({ affected: 5 });

      await service.marcarTodasComoLeidas(1);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { usuarioId: 1, leida: false },
        expect.objectContaining({
          leida: true,
          fechaLectura: expect.any(Date),
        }),
      );
      expect(mockChatGateway.emitirNotificacionesTodasLeidas).toHaveBeenCalledWith(1);
    });
  });

  describe('contarNoLeidas', () => {
    it('should count unread notifications', async () => {
      mockRepository.count.mockResolvedValue(5);

      const result = await service.contarNoLeidas(1);

      expect(result).toBe(5);
      expect(mockRepository.count).toHaveBeenCalledWith({
        where: { usuarioId: 1, leida: false },
      });
    });
  });

  describe('contarMensajesNoLeidos', () => {
    it('should count unread message notifications', async () => {
      mockRepository.count.mockResolvedValue(3);

      const result = await service.contarMensajesNoLeidos(1);

      expect(result).toBe(3);
      expect(mockRepository.count).toHaveBeenCalledWith({
        where: {
          usuarioId: 1,
          leida: false,
          tipoNotificacion: TipoNotificacion.MENSAJE_NUEVO,
        },
      });
    });

    it('should return 0 on error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockRepository.count.mockRejectedValue(new Error('Database error'));

      const result = await service.contarMensajesNoLeidos(1);

      expect(result).toBe(0);
      consoleSpy.mockRestore();
    });
  });

  describe('obtenerNotificacionesUsuario', () => {
    it('should get user notifications with default limit', async () => {
      const notificaciones = [mockNotificacion];
      mockRepository.find.mockResolvedValue(notificaciones);

      const result = await service.obtenerNotificacionesUsuario(1);

      expect(result).toEqual(notificaciones);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { usuarioId: 1 },
        order: { fechaCreacion: 'DESC' },
        take: 50,
      });
    });

    it('should get only unread notifications', async () => {
      const notificaciones = [mockNotificacion];
      mockRepository.find.mockResolvedValue(notificaciones);

      const result = await service.obtenerNotificacionesUsuario(1, 50, true);

      expect(result).toEqual(notificaciones);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { usuarioId: 1, leida: false },
        order: { fechaCreacion: 'DESC' },
        take: 50,
      });
    });
  });

  describe('eliminarNotificacion', () => {
    it('should delete notification', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await service.eliminarNotificacion(1, 1);

      expect(mockRepository.delete).toHaveBeenCalledWith({
        notificacionId: 1,
        usuarioId: 1,
      });
    });

    it('should throw error if notification not found', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.eliminarNotificacion(1, 1)).rejects.toThrow(
        'Notificación no encontrada',
      );
    });
  });

  describe('marcarLeidasPorGrupo', () => {
    it('should mark group message notifications as read', async () => {
      mockRepository.update.mockResolvedValue({ affected: 3 });

      await service.marcarLeidasPorGrupo(1, 1);

      expect(mockRepository.update).toHaveBeenCalledWith(
        {
          grupoId: 1,
          usuarioId: 1,
          tipoNotificacion: TipoNotificacion.MENSAJE_NUEVO,
          leida: false,
        },
        expect.objectContaining({
          leida: true,
          fechaLectura: expect.any(Date),
        }),
      );
      expect(mockChatGateway.emitirNotificacionesTodasLeidas).toHaveBeenCalledWith(1);
    });
  });
});
