import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { RolesService } from '../roles/roles.service';
import { GruposService } from '../grupos/grupos.service';
import { UsuariosGruposService } from '../usuarios-grupos/usuarios-grupos.service';
import { InventarioTecnicoService } from '../inventario-tecnico/inventario-tecnico.service';
import { MovimientosService } from '../movimientos/movimientos.service';
import { InventariosService } from '../inventarios/inventarios.service';
import { BodegasService } from '../bodegas/bodegas.service';
import * as bcrypt from 'bcrypt';

describe('UsersService - Roles y Permisos', () => {
  let service: UsersService;
  let mockRepository: any;
  let mockRolesService: any;

  const mockUser = {
    usuarioId: 1,
    usuarioCorreo: 'test@example.com',
    usuarioContrasena: bcrypt.hashSync('password123', 10),
    usuarioEstado: true,
    usuarioRolId: 1,
    usuarioRol: {
      rolTipo: 'admin',
    },
  };

  beforeEach(async () => {
    mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    mockRolesService = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: RolesService,
          useValue: mockRolesService,
        },
        {
          provide: GruposService,
          useValue: {
            findOne: jest.fn(),
            obtenerGrupoPorEntidad: jest.fn(),
            crearMensajeSistema: jest.fn(),
            cerrarChat: jest.fn(),
          },
        },
        {
          provide: UsuariosGruposService,
          useValue: { agregarUsuarioGrupo: jest.fn(), desasignarTodos: jest.fn() },
        },
        {
          provide: InventarioTecnicoService,
          useValue: { findOne: jest.fn(), crearInventarioTecnico: jest.fn() },
        },
        {
          provide: MovimientosService,
          useValue: { findByInstalacion: jest.fn(), remove: jest.fn() },
        },
        {
          provide: InventariosService,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: BodegasService,
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('update - Restricción de cambio de contraseña', () => {
    it('should allow superadmin to change password of other users', async () => {
      const targetUser = { ...mockUser, usuarioId: 2 };
      const updateDto = {
        usuarioContrasena: 'newPassword123',
      };

      mockRepository.findOne.mockResolvedValue(targetUser);
      mockRepository.save.mockResolvedValue({
        ...targetUser,
        usuarioContrasena: bcrypt.hashSync('newPassword123', 10),
      });

      const result = await service.update(
        2,
        updateDto,
        1, // requestingUserId (superadmin)
        'superadmin', // requestingUserRole
      );

      expect(result).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should allow user to change their own password', async () => {
      const updateDto = {
        usuarioContrasena: 'newPassword123',
      };

      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue({
        ...mockUser,
        usuarioContrasena: bcrypt.hashSync('newPassword123', 10),
      });

      const result = await service.update(
        1,
        updateDto,
        1, // requestingUserId (same user)
        'admin', // requestingUserRole
      );

      expect(result).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should reject non-superadmin from changing other user password', async () => {
      const targetUser = { ...mockUser, usuarioId: 2 };
      const updateDto = {
        usuarioContrasena: 'newPassword123',
      };

      mockRepository.findOne.mockResolvedValue(targetUser);

      await expect(
        service.update(
          2,
          updateDto,
          1, // requestingUserId (admin trying to change user 2's password)
          'admin', // requestingUserRole (not superadmin)
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(service.update(2, updateDto, 1, 'admin')).rejects.toThrow(
        'Solo puedes cambiar tu propia contraseña',
      );
    });
  });

  describe('update - Restricción de cambio de roles', () => {
    it('should allow superadmin to change user role', async () => {
      const targetUser = { ...mockUser, usuarioId: 2, usuarioRolId: 1 };
      const updateDto = {
        usuarioRolId: 2, // Changing to different role
      };

      mockRepository.findOne.mockResolvedValue(targetUser);
      mockRolesService.findOne.mockResolvedValue({
        rolId: 2,
        rolTipo: 'almacenista',
      });
      mockRepository.save.mockResolvedValue({
        ...targetUser,
        usuarioRolId: 2,
      });

      const result = await service.update(
        2,
        updateDto,
        1, // requestingUserId (superadmin)
        'superadmin', // requestingUserRole
      );

      expect(result).toBeDefined();
    });

    it('should reject non-superadmin from changing user role', async () => {
      const targetUser = { ...mockUser, usuarioId: 2, usuarioRolId: 1 };
      const updateDto = {
        usuarioRolId: 2,
      };

      mockRepository.findOne.mockResolvedValue(targetUser);
      mockRolesService.findOne.mockResolvedValue({
        rolId: 2,
        rolTipo: 'almacenista',
      });

      await expect(
        service.update(
          2,
          updateDto,
          1, // requestingUserId (admin)
          'admin', // requestingUserRole (not superadmin)
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(service.update(2, updateDto, 1, 'admin')).rejects.toThrow(
        'Solo SuperAdmin o Gerencia pueden cambiar roles de usuarios',
      );
    });
  });

  describe('changeRole - Solo superadmin', () => {
    it('should allow superadmin to change role', async () => {
      const targetUser = { ...mockUser, usuarioId: 2, usuarioRolId: 1 };

      mockRepository.findOne.mockResolvedValue(targetUser);
      mockRolesService.findOne.mockResolvedValue({
        rolId: 2,
        rolTipo: 'almacenista',
        rolEstado: true,
      });
      mockRepository.save.mockResolvedValue({
        ...targetUser,
        usuarioRolId: 2,
      });

      const result = await service.changeRole(2, 2);

      expect(result).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });
});
