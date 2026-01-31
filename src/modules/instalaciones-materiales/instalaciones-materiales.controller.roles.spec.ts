import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { InstalacionesMaterialesController } from './instalaciones-materiales.controller';
import { InstalacionesMaterialesService } from './instalaciones-materiales.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('InstalacionesMaterialesController - Roles y Permisos', () => {
  let _controller: InstalacionesMaterialesController;
  let _service: InstalacionesMaterialesService;
  let rolesGuard: RolesGuard;
  let _reflector: Reflector;

  const mockService = {
    create: jest.fn(),
    asignarMateriales: jest.fn(),
    findAll: jest.fn(),
    findByInstalacion: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    aprobarMaterial: jest.fn(),
  };

  const mockReflector = {
    get: jest.fn(),
  };

  const createMockExecutionContext = (user: any, roles?: string[]): any => {
    mockReflector.get.mockReturnValue(roles);
    const mockHandler = jest.fn();
    return {
      getHandler: () => mockHandler,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: () => ({}),
        getNext: () => jest.fn(),
      }),
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstalacionesMaterialesController],
      providers: [
        {
          provide: InstalacionesMaterialesService,
          useValue: mockService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        RolesGuard,
        {
          provide: JwtAuthGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
      ],
    }).compile();

    _controller = module.get<InstalacionesMaterialesController>(InstalacionesMaterialesController);
    _service = module.get<InstalacionesMaterialesService>(InstalacionesMaterialesService);
    rolesGuard = module.get<RolesGuard>(RolesGuard);
    _reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('aprobarMaterial - Permisos', () => {
    it('should allow superadmin to approve material', () => {
      const user = { usuarioRol: { rolTipo: 'superadmin' } };
      const context = createMockExecutionContext(user, ['superadmin', 'admin', 'almacenista']);

      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should allow admin to approve material', () => {
      const user = { usuarioRol: { rolTipo: 'admin' } };
      const context = createMockExecutionContext(user, ['superadmin', 'admin', 'almacenista']);

      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should allow almacenista to approve material', () => {
      const user = { usuarioRol: { rolTipo: 'almacenista' } };
      const context = createMockExecutionContext(user, ['superadmin', 'admin', 'almacenista']);

      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should deny tecnico from approving material', () => {
      const user = { usuarioRol: { rolTipo: 'tecnico' } };
      const context = createMockExecutionContext(user, ['superadmin', 'admin', 'almacenista']);

      expect(rolesGuard.canActivate(context)).toBe(false);
    });

    it('should deny soldador from approving material', () => {
      const user = { usuarioRol: { rolTipo: 'soldador' } };
      const context = createMockExecutionContext(user, ['superadmin', 'admin', 'almacenista']);

      expect(rolesGuard.canActivate(context)).toBe(false);
    });

    it('should deny bodega-internas from approving material', () => {
      const user = { usuarioRol: { rolTipo: 'bodega-internas' } };
      const context = createMockExecutionContext(user, ['superadmin', 'admin', 'almacenista']);

      expect(rolesGuard.canActivate(context)).toBe(false);
    });
  });

  describe('asignarMateriales - Permisos', () => {
    it('should allow tecnico to assign materials', () => {
      const user = { usuarioRol: { rolTipo: 'tecnico' } };
      const context = createMockExecutionContext(user, [
        'superadmin',
        'admin',
        'tecnico',
        'soldador',
      ]);

      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should deny almacenista from assigning materials to installations', () => {
      const user = { usuarioRol: { rolTipo: 'almacenista' } };
      const context = createMockExecutionContext(user, [
        'superadmin',
        'admin',
        'tecnico',
        'soldador',
      ]);

      expect(rolesGuard.canActivate(context)).toBe(false);
    });

    it('should deny bodega-internas from assigning materials to installations', () => {
      const user = { usuarioRol: { rolTipo: 'bodega-internas' } };
      const context = createMockExecutionContext(user, [
        'superadmin',
        'admin',
        'tecnico',
        'soldador',
      ]);

      expect(rolesGuard.canActivate(context)).toBe(false);
    });
  });
});
