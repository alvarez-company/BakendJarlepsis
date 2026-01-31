import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { InstalacionesService } from './instalaciones.service';
import { Instalacion } from './instalacion.entity';
import { Cliente } from '../clientes/cliente.entity';
import { UsersService } from '../users/users.service';
import { MovimientosService } from '../movimientos/movimientos.service';
import { InstalacionesMaterialesService } from '../instalaciones-materiales/instalaciones-materiales.service';
import { ChatGateway } from '../chat/chat.gateway';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { InstalacionesUsuariosService } from '../instalaciones-usuarios/instalaciones-usuarios.service';
import { MaterialesService } from '../materiales/materiales.service';
import { InventariosService } from '../inventarios/inventarios.service';
import { ClientesService } from '../clientes/clientes.service';
import { GruposService } from '../grupos/grupos.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EstadosInstalacionService } from '../estados-instalacion/estados-instalacion.service';
import { InventarioTecnicoService } from '../inventario-tecnico/inventario-tecnico.service';
import { NumerosMedidorService } from '../numeros-medidor/numeros-medidor.service';

describe('InstalacionesService - Permisos', () => {
  let service: InstalacionesService;
  let _usersService: UsersService;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    query: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    })),
    update: jest.fn().mockResolvedValue(undefined),
  };

  const mockClienteRepository = {
    findOne: jest.fn(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
  };

  const mockMovimientosService = {
    findByInstalacion: jest.fn(),
  };

  const mockInstalacionesMaterialesService = {
    findByInstalacion: jest.fn(),
    removeByInstalacion: jest.fn().mockResolvedValue(undefined),
  };

  const mockChatGateway = {
    emitirEventoInstalacion: jest.fn(),
  };
  const mockNotificacionesService = {};
  const mockInstalacionesUsuariosService = {
    desasignarTodos: jest.fn().mockResolvedValue(undefined),
    findByInstalacion: jest.fn().mockResolvedValue([]),
  };
  const mockMaterialesService = {};
  const mockInventariosService = {};
  const mockClientesService = {
    update: jest.fn().mockResolvedValue({}),
  };
  const mockGruposService = {
    obtenerGrupoPorEntidad: jest.fn().mockResolvedValue(null),
    crearMensajeSistema: jest.fn().mockResolvedValue(undefined),
  };
  const mockAuditoriaService = {
    registrarEliminacion: jest.fn().mockResolvedValue(undefined),
  };
  const mockEstadosInstalacionService = {
    findByCodigo: jest
      .fn()
      .mockResolvedValue({ estadoInstalacionId: 1, estadoCodigo: 'en_proceso' }),
  };
  const mockInventarioTecnicoService = {};
  const mockNumerosMedidorService = {
    findByInstalacion: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstalacionesService,
        {
          provide: getRepositoryToken(Instalacion),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Cliente),
          useValue: mockClienteRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: MovimientosService,
          useValue: mockMovimientosService,
        },
        {
          provide: InstalacionesMaterialesService,
          useValue: mockInstalacionesMaterialesService,
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
          provide: InstalacionesUsuariosService,
          useValue: mockInstalacionesUsuariosService,
        },
        {
          provide: MaterialesService,
          useValue: mockMaterialesService,
        },
        {
          provide: InventariosService,
          useValue: mockInventariosService,
        },
        {
          provide: ClientesService,
          useValue: mockClientesService,
        },
        {
          provide: GruposService,
          useValue: mockGruposService,
        },
        {
          provide: AuditoriaService,
          useValue: mockAuditoriaService,
        },
        {
          provide: EstadosInstalacionService,
          useValue: mockEstadosInstalacionService,
        },
        {
          provide: InventarioTecnicoService,
          useValue: mockInventarioTecnicoService,
        },
        {
          provide: NumerosMedidorService,
          useValue: mockNumerosMedidorService,
        },
      ],
    }).compile();

    service = module.get<InstalacionesService>(InstalacionesService);
    _usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('update - Permisos', () => {
    const mockInstalacion = {
      instalacionId: 1,
      estado: 'asignada',
      identificadorUnico: 'INST-001',
      instalacionCodigo: 'INST-001',
      tipoInstalacion: { tipoInstalacionNombre: 'Internas' },
      usuariosAsignados: [],
    };

    beforeEach(() => {
      // Mock del query raw que usa findOne
      mockRepository.query.mockResolvedValue([
        {
          instalacionId: 1,
          identificadorUnico: 'INST-001',
          instalacionCodigo: 'INST-001',
          tipoInstalacionId: 1,
          clienteId: 1,
          estado: 'asignada',
        },
      ]);
      mockRepository.save.mockResolvedValue(mockInstalacion);
    });

    it('should allow superadmin to update installation', async () => {
      const user = { usuarioRol: { rolTipo: 'superadmin' }, usuarioId: 1 };
      mockUsersService.findOne.mockResolvedValue(user);
      // Mock de findOne que llama a query
      jest.spyOn(service, 'findOne').mockResolvedValue(mockInstalacion as any);

      await expect(
        service.update(1, { instalacionCodigo: 'INST-002' }, 1, user),
      ).resolves.toBeDefined();
    });

    it('should allow bodega-internas to update installation', async () => {
      const user = { usuarioRol: { rolTipo: 'bodega-internas' }, usuarioId: 1 };
      mockUsersService.findOne.mockResolvedValue(user);
      jest.spyOn(service, 'findOne').mockResolvedValue(mockInstalacion as any);

      await expect(
        service.update(1, { instalacionCodigo: 'INST-002' }, 1, user),
      ).resolves.toBeDefined();
    });

    it('should allow bodega-redes to update installation', async () => {
      const user = { usuarioRol: { rolTipo: 'bodega-redes' }, usuarioId: 1 };
      mockUsersService.findOne.mockResolvedValue(user);
      jest.spyOn(service, 'findOne').mockResolvedValue({
        ...mockInstalacion,
        tipoInstalacion: { tipoInstalacionNombre: 'Redes' },
      } as any);

      await expect(
        service.update(1, { instalacionCodigo: 'INST-002' }, 1, user),
      ).resolves.toBeDefined();
    });

    it('should deny almacenista from updating installation', async () => {
      const user = { usuarioRol: { rolTipo: 'almacenista' }, usuarioId: 1 };
      mockUsersService.findOne.mockResolvedValue(user);
      jest.spyOn(service, 'findOne').mockResolvedValue(mockInstalacion as any);

      await expect(service.update(1, { instalacionCodigo: 'INST-002' }, 1, user)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, { instalacionCodigo: 'INST-002' }, 1, user)).rejects.toThrow(
        'No tienes permisos para editar instalaciones',
      );
    });

    it('should allow admin (centro operativo) to update installation', async () => {
      const user = { usuarioRol: { rolTipo: 'admin' }, usuarioId: 1, usuarioSede: 1 };
      mockUsersService.findOne.mockResolvedValue(user);
      jest.spyOn(service, 'findOne').mockResolvedValue(mockInstalacion as any);

      await expect(service.update(1, { instalacionCodigo: 'INST-002' }, 1, user)).resolves.toBeDefined();
    });
  });

  describe('remove - Permisos', () => {
    const mockInstalacion = {
      instalacionId: 1,
      estado: 'asignada',
    };

    beforeEach(() => {
      mockRepository.query.mockResolvedValue([
        {
          instalacionId: 1,
          estado: 'asignada',
        },
      ]);
      mockRepository.remove.mockResolvedValue(mockInstalacion);
      mockMovimientosService.findByInstalacion.mockResolvedValue([]);
      mockInstalacionesMaterialesService.findByInstalacion.mockResolvedValue([]);
    });

    it('should allow superadmin to delete installation', async () => {
      const user = { usuarioRol: { rolTipo: 'superadmin' }, usuarioId: 1 };
      mockUsersService.findOne.mockResolvedValue(user);
      jest.spyOn(service, 'findOne').mockResolvedValue({ ...mockInstalacion, clienteId: 1 } as any);

      await expect(service.remove(1, 1, user)).resolves.toBeUndefined();
    });

    it('should allow bodega-internas to delete installation', async () => {
      const user = { usuarioRol: { rolTipo: 'bodega-internas' }, usuarioId: 1 };
      mockUsersService.findOne.mockResolvedValue(user);
      jest.spyOn(service, 'findOne').mockResolvedValue({
        ...mockInstalacion,
        tipoInstalacion: { tipoInstalacionNombre: 'Internas' },
        clienteId: 1,
      } as any);

      await expect(service.remove(1, 1, user)).resolves.toBeUndefined();
    });

    it('should deny almacenista from deleting installation', async () => {
      const user = { usuarioRol: { rolTipo: 'almacenista' }, usuarioId: 1 };
      mockUsersService.findOne.mockResolvedValue(user);
      jest.spyOn(service, 'findOne').mockResolvedValue(mockInstalacion as any);

      await expect(service.remove(1, 1, user)).rejects.toThrow(BadRequestException);
      await expect(service.remove(1, 1, user)).rejects.toThrow(
        'No tienes permisos para eliminar instalaciones',
      );
    });
  });

  describe('actualizarEstado - Permisos', () => {
    const mockInstalacion = {
      instalacionId: 1,
      estado: 'asignada',
    };

    beforeEach(() => {
      mockRepository.query.mockResolvedValue([
        {
          instalacionId: 1,
          estado: 'asignada',
        },
      ]);
      mockRepository.save.mockResolvedValue({ ...mockInstalacion, estado: 'en-proceso' });
    });

    it('should allow superadmin to change installation status', async () => {
      const user = { usuarioRol: { rolTipo: 'superadmin' }, usuarioId: 1 };
      mockUsersService.findOne.mockResolvedValue(user);
      jest.spyOn(service, 'findOne').mockResolvedValue(mockInstalacion as any);

      await expect(
        service.actualizarEstado(1, 'en_proceso' as any, 1, user),
      ).resolves.toBeDefined();
    });

    it('should deny almacenista from changing installation status', async () => {
      const user = { usuarioRol: { rolTipo: 'almacenista' }, usuarioId: 1 };
      mockUsersService.findOne.mockResolvedValue(user);
      jest.spyOn(service, 'findOne').mockResolvedValue(mockInstalacion as any);

      await expect(service.actualizarEstado(1, 'en-proceso' as any, 1, user)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.actualizarEstado(1, 'en-proceso' as any, 1, user)).rejects.toThrow(
        'No tienes permisos para cambiar el estado de instalaciones',
      );
    });
  });
});
