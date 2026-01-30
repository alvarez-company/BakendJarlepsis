import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('NotificacionesController - Roles y Permisos', () => {
  let _controller: NotificacionesController;
  let _service: NotificacionesService;
  let rolesGuard: RolesGuard;
  let _reflector: Reflector;

  const mockService = {
    obtenerNotificacionesUsuario: jest.fn(),
    contarNoLeidas: jest.fn(),
    contarMensajesNoLeidos: jest.fn(),
    marcarComoLeida: jest.fn(),
    marcarTodasComoLeidas: jest.fn(),
    eliminarNotificacion: jest.fn(),
    marcarLeidasPorGrupo: jest.fn(),
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
      controllers: [NotificacionesController],
      providers: [
        {
          provide: NotificacionesService,
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

    _controller = module.get<NotificacionesController>(NotificacionesController);
    _service = module.get<NotificacionesService>(NotificacionesService);
    rolesGuard = module.get<RolesGuard>(RolesGuard);
    _reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('obtenerMisNotificaciones - Permisos', () => {
    const allowedRoles = [
      'superadmin',
      'admin',
      'administrador',
      'almacenista',
      'tecnico',
      'soldador',
      'bodega-internas',
      'bodega-redes',
    ];

    it('should allow all roles to get their notifications', () => {
      allowedRoles.forEach((role) => {
        const user = { usuarioRol: { rolTipo: role } };
        const context = createMockExecutionContext(user, allowedRoles);
        expect(rolesGuard.canActivate(context)).toBe(true);
      });
    });
  });

  describe('contarNoLeidas - Permisos', () => {
    const allowedRoles = [
      'superadmin',
      'admin',
      'administrador',
      'almacenista',
      'tecnico',
      'soldador',
      'bodega-internas',
      'bodega-redes',
    ];

    it('should allow all roles to count unread notifications', () => {
      allowedRoles.forEach((role) => {
        const user = { usuarioRol: { rolTipo: role } };
        const context = createMockExecutionContext(user, allowedRoles);
        expect(rolesGuard.canActivate(context)).toBe(true);
      });
    });
  });

  describe('marcarComoLeida - Permisos', () => {
    const allowedRoles = [
      'superadmin',
      'admin',
      'administrador',
      'almacenista',
      'tecnico',
      'soldador',
      'bodega-internas',
      'bodega-redes',
    ];

    it('should allow all roles to mark notifications as read', () => {
      allowedRoles.forEach((role) => {
        const user = { usuarioRol: { rolTipo: role } };
        const context = createMockExecutionContext(user, allowedRoles);
        expect(rolesGuard.canActivate(context)).toBe(true);
      });
    });
  });
});
