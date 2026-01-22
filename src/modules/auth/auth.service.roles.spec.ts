import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

describe('AuthService - Roles y Restricciones', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUsersService = {
    findByEmail: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login - Restricción de roles técnico y soldador', () => {
    const mockPassword = 'password123';
    const hashedPassword = bcrypt.hashSync(mockPassword, 10);

    it('should allow login for superadmin', async () => {
      const mockUser = {
        usuarioId: 1,
        usuarioCorreo: 'superadmin@test.com',
        usuarioContrasena: hashedPassword,
        usuarioEstado: true,
        usuarioNombre: 'Super',
        usuarioApellido: 'Admin',
        usuarioRolId: 1,
        usuarioSede: null,
        usuarioBodega: null,
        usuarioFoto: null,
        usuarioRol: {
          rolTipo: 'superadmin',
        },
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      const result = await service.login({
        email: 'superadmin@test.com',
        password: mockPassword,
      });

      expect(result).toHaveProperty('access_token');
      expect(result.user.rolTipo).toBe('superadmin');
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('should allow login for admin', async () => {
      const mockUser = {
        usuarioId: 2,
        usuarioCorreo: 'admin@test.com',
        usuarioContrasena: hashedPassword,
        usuarioEstado: true,
        usuarioNombre: 'Admin',
        usuarioApellido: 'User',
        usuarioRolId: 2,
        usuarioSede: 1,
        usuarioBodega: null,
        usuarioFoto: null,
        usuarioRol: {
          rolTipo: 'admin',
        },
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      const result = await service.login({
        email: 'admin@test.com',
        password: mockPassword,
      });

      expect(result).toHaveProperty('access_token');
      expect(result.user.rolTipo).toBe('admin');
    });

    it('should allow login for almacenista', async () => {
      const mockUser = {
        usuarioId: 3,
        usuarioCorreo: 'almacenista@test.com',
        usuarioContrasena: hashedPassword,
        usuarioEstado: true,
        usuarioNombre: 'Almacenista',
        usuarioApellido: 'User',
        usuarioRolId: 3,
        usuarioSede: 1,
        usuarioBodega: null,
        usuarioFoto: null,
        usuarioRol: {
          rolTipo: 'almacenista',
        },
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      const result = await service.login({
        email: 'almacenista@test.com',
        password: mockPassword,
      });

      expect(result).toHaveProperty('access_token');
      expect(result.user.rolTipo).toBe('almacenista');
    });

    it('should reject login for tecnico in main system', async () => {
      const mockUser = {
        usuarioId: 4,
        usuarioCorreo: 'tecnico@test.com',
        usuarioContrasena: hashedPassword,
        usuarioEstado: true,
        usuarioNombre: 'Tecnico',
        usuarioApellido: 'User',
        usuarioRolId: 4,
        usuarioSede: 1,
        usuarioBodega: null,
        usuarioFoto: null,
        usuarioRol: {
          rolTipo: 'tecnico',
        },
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.login({
          email: 'tecnico@test.com',
          password: mockPassword,
        }),
      ).rejects.toThrow(UnauthorizedException);
      
      await expect(
        service.login({
          email: 'tecnico@test.com',
          password: mockPassword,
        }),
      ).rejects.toThrow('Los técnicos y soldadores solo pueden iniciar sesión en la aplicación móvil');
    });

    it('should reject login for soldador in main system', async () => {
      const mockUser = {
        usuarioId: 5,
        usuarioCorreo: 'soldador@test.com',
        usuarioContrasena: hashedPassword,
        usuarioEstado: true,
        usuarioNombre: 'Soldador',
        usuarioApellido: 'User',
        usuarioRolId: 5,
        usuarioSede: 1,
        usuarioBodega: null,
        usuarioFoto: null,
        usuarioRol: {
          rolTipo: 'soldador',
        },
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.login({
          email: 'soldador@test.com',
          password: mockPassword,
        }),
      ).rejects.toThrow(UnauthorizedException);
      
      await expect(
        service.login({
          email: 'soldador@test.com',
          password: mockPassword,
        }),
      ).rejects.toThrow('Los técnicos y soldadores solo pueden iniciar sesión en la aplicación móvil');
    });

    it('should allow login for bodega-internas', async () => {
      const mockUser = {
        usuarioId: 6,
        usuarioCorreo: 'bodega@test.com',
        usuarioContrasena: hashedPassword,
        usuarioEstado: true,
        usuarioNombre: 'Bodega',
        usuarioApellido: 'User',
        usuarioRolId: 6,
        usuarioSede: null,
        usuarioBodega: 1,
        usuarioFoto: null,
        usuarioRol: {
          rolTipo: 'bodega-internas',
        },
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      const result = await service.login({
        email: 'bodega@test.com',
        password: mockPassword,
      });

      expect(result).toHaveProperty('access_token');
      expect(result.user.rolTipo).toBe('bodega-internas');
    });
  });
});
