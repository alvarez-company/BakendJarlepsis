import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    findByDocument: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should throw UnauthorizedException when user does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.validateUser('test@example.com', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const mockUser = {
        usuarioId: 1,
        usuarioCorreo: 'test@example.com',
        usuarioContrasena: 'hashedPassword',
        usuarioEstado: false,
      };
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.validateUser('test@example.com', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      const mockUser = {
        usuarioId: 1,
        usuarioCorreo: 'test@example.com',
        usuarioContrasena: 'hashedPassword',
        usuarioEstado: true,
      };
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.validateUser('test@example.com', 'wrongPassword')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('register', () => {
    it('should throw error when email already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ usuarioId: 1 });
      mockUsersService.findByDocument.mockResolvedValue(null);

      await expect(
        service.register({
          usuarioCorreo: 'existing@example.com',
          usuarioDocumento: '1234567890',
          usuarioContrasena: 'password123',
          usuarioNombre: 'Test',
          usuarioApellido: 'User',
          usuarioRolId: 1,
        }),
      ).rejects.toThrow();
    });

    it('should throw error when document already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.findByDocument.mockResolvedValue({ usuarioId: 1 });

      await expect(
        service.register({
          usuarioCorreo: 'new@example.com',
          usuarioDocumento: '1234567890',
          usuarioContrasena: 'password123',
          usuarioNombre: 'Test',
          usuarioApellido: 'User',
          usuarioRolId: 1,
        }),
      ).rejects.toThrow();
    });
  });
});
