import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;

  const mockReflector = {
    get: jest.fn(),
  };

  const createMockExecutionContext = (user: any, roles?: string[]): any => {
    mockReflector.get.mockReturnValue(roles);
    const mockHandler = jest.fn();
    return {
      getHandler: () => mockHandler,
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
        getResponse: () => ({}),
        getNext: () => jest.fn(),
      }),
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access when no roles are required', () => {
      const context = createMockExecutionContext(
        { usuarioRol: { rolTipo: 'superadmin' } },
        undefined,
      );
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user role matches required role (superadmin)', () => {
      const user = { usuarioRol: { rolTipo: 'superadmin' } };
      const context = createMockExecutionContext(user, ['superadmin', 'admin']);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user role matches required role (almacenista)', () => {
      const user = { usuarioRol: { rolTipo: 'almacenista' } };
      const context = createMockExecutionContext(user, ['almacenista', 'superadmin']);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user role matches required role (bodega-internas)', () => {
      const user = { usuarioRol: { rolTipo: 'bodega-internas' } };
      const context = createMockExecutionContext(user, ['bodega-internas', 'bodega-redes']);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny access when user role does not match required roles', () => {
      const user = { usuarioRol: { rolTipo: 'tecnico' } };
      const context = createMockExecutionContext(user, ['superadmin', 'admin']);
      expect(guard.canActivate(context)).toBe(false);
    });

    it('should work with user.role fallback', () => {
      const user = { role: 'almacenista' };
      const context = createMockExecutionContext(user, ['almacenista']);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny access when user has no role', () => {
      const user = {};
      const context = createMockExecutionContext(user, ['superadmin']);
      expect(guard.canActivate(context)).toBe(false);
    });

    it('should handle admin (Administrador centro operativo) role correctly', () => {
      const user = { usuarioRol: { rolTipo: 'admin' } };
      const context = createMockExecutionContext(user, ['admin', 'superadmin']);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should handle soldador role correctly', () => {
      const user = { usuarioRol: { rolTipo: 'soldador' } };
      const context = createMockExecutionContext(user, ['soldador', 'tecnico']);
      expect(guard.canActivate(context)).toBe(true);
    });
  });
});
