import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { AsignacionesTecnicosService } from './asignaciones-tecnicos.service';
import { AsignacionTecnico } from './asignacion-tecnico.entity';
import { UsersService } from '../users/users.service';
import { MaterialesService } from '../materiales/materiales.service';
import { InventariosService } from '../inventarios/inventarios.service';
import { MovimientosService } from '../movimientos/movimientos.service';
import { InventarioTecnicoService } from '../inventario-tecnico/inventario-tecnico.service';
import { NumerosMedidorService } from '../numeros-medidor/numeros-medidor.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

describe('AsignacionesTecnicosService - Permisos', () => {
  let service: AsignacionesTecnicosService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
  };

  const mockMaterialesService = {
    findOne: jest.fn(),
  };

  const mockInventariosService = {
    findOne: jest.fn(),
  };

  const mockMovimientosService = {};
  const mockInventarioTecnicoService = {};
  const mockNumerosMedidorService = {};
  const mockAuditoriaService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsignacionesTecnicosService,
        {
          provide: getRepositoryToken(AsignacionTecnico),
          useValue: mockRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
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
          provide: MovimientosService,
          useValue: mockMovimientosService,
        },
        {
          provide: InventarioTecnicoService,
          useValue: mockInventarioTecnicoService,
        },
        {
          provide: NumerosMedidorService,
          useValue: mockNumerosMedidorService,
        },
        {
          provide: AuditoriaService,
          useValue: mockAuditoriaService,
        },
      ],
    }).compile();

    service = module.get<AsignacionesTecnicosService>(AsignacionesTecnicosService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create - Permisos de asignación de material', () => {
    const mockCreateDto = {
      asignacionCodigo: 'ASIG-001',
      tecnicoId: 1,
      materialId: 1,
      cantidad: 10,
    };

    beforeEach(() => {
      mockRepository.create.mockReturnValue(mockCreateDto);
      mockRepository.save.mockResolvedValue({ ...mockCreateDto, asignacionId: 1 });
    });

    it('should allow superadmin to create assignment', async () => {
      const user = { usuarioRol: { rolTipo: 'superadmin' } };
      await expect(service.create(mockCreateDto as any, user)).resolves.toBeDefined();
    });

    it('should allow admin to create assignment', async () => {
      const user = { usuarioRol: { rolTipo: 'admin' } };
      await expect(service.create(mockCreateDto as any, user)).resolves.toBeDefined();
    });

    it('should allow almacenista to create assignment', async () => {
      const user = { usuarioRol: { rolTipo: 'almacenista' } };
      await expect(service.create(mockCreateDto as any, user)).resolves.toBeDefined();
    });

    it('should deny bodega-internas from creating assignment', async () => {
      const user = { usuarioRol: { rolTipo: 'bodega-internas' } };
      await expect(service.create(mockCreateDto as any, user)).rejects.toThrow(BadRequestException);
      await expect(service.create(mockCreateDto as any, user)).rejects.toThrow(
        'Los roles de Bodega Internas y Bodega Redes no pueden asignar material',
      );
    });

    it('should deny bodega-redes from creating assignment', async () => {
      const user = { usuarioRol: { rolTipo: 'bodega-redes' } };
      await expect(service.create(mockCreateDto as any, user)).rejects.toThrow(BadRequestException);
      await expect(service.create(mockCreateDto as any, user)).rejects.toThrow(
        'Los roles de Bodega Internas y Bodega Redes no pueden asignar material',
      );
    });

    it('should work with user.role fallback', async () => {
      const user = { role: 'bodega-internas' };
      await expect(service.create(mockCreateDto as any, user)).rejects.toThrow(BadRequestException);
    });
  });
});
