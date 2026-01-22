import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('UsersController - Roles y Permisos', () => {
  let controller: UsersController;
  let service: UsersService;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    changeRole: jest.fn(),
    updateEstado: jest.fn(),
    changePassword: jest.fn(),
    updateMyProfile: jest.fn(),
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
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
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

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
    rolesGuard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('changeRole - Solo superadmin', () => {
    it('should allow superadmin to change user role', () => {
      const user = { usuarioRol: { rolTipo: 'superadmin' } };
      const context = createMockExecutionContext(user, ['superadmin']);

      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should deny admin from changing user role', () => {
      const user = { usuarioRol: { rolTipo: 'admin' } };
      const context = createMockExecutionContext(user, ['superadmin']);

      expect(rolesGuard.canActivate(context)).toBe(false);
    });

    it('should deny almacenista from changing user role', () => {
      const user = { usuarioRol: { rolTipo: 'almacenista' } };
      const context = createMockExecutionContext(user, ['superadmin']);

      expect(rolesGuard.canActivate(context)).toBe(false);
    });
  });

  describe('create - Permisos', () => {
    it('should allow superadmin to create users', () => {
      const user = { usuarioRol: { rolTipo: 'superadmin' } };
      const context = createMockExecutionContext(user, [
        'superadmin',
        'admin',
        'bodega-internas',
        'bodega-redes',
      ]);

      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should allow admin to create users', () => {
      const user = { usuarioRol: { rolTipo: 'admin' } };
      const context = createMockExecutionContext(user, [
        'superadmin',
        'admin',
        'bodega-internas',
        'bodega-redes',
      ]);

      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should allow bodega-internas to create users', () => {
      const user = { usuarioRol: { rolTipo: 'bodega-internas' } };
      const context = createMockExecutionContext(user, [
        'superadmin',
        'admin',
        'bodega-internas',
        'bodega-redes',
      ]);

      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should deny almacenista from creating users', () => {
      const user = { usuarioRol: { rolTipo: 'almacenista' } };
      const context = createMockExecutionContext(user, [
        'superadmin',
        'admin',
        'bodega-internas',
        'bodega-redes',
      ]);

      expect(rolesGuard.canActivate(context)).toBe(false);
    });
  });

  describe('remove - Solo superadmin', () => {
    it('should allow superadmin to delete users', () => {
      const user = { usuarioRol: { rolTipo: 'superadmin' } };
      const context = createMockExecutionContext(user, ['superadmin']);

      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should deny admin from deleting users', () => {
      const user = { usuarioRol: { rolTipo: 'admin' } };
      const context = createMockExecutionContext(user, ['superadmin']);

      expect(rolesGuard.canActivate(context)).toBe(false);
    });
  });
});
