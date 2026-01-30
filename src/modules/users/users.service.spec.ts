import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { GruposService } from '../grupos/grupos.service';
import { UsuariosGruposService } from '../usuarios-grupos/usuarios-grupos.service';
import { InventarioTecnicoService } from '../inventario-tecnico/inventario-tecnico.service';
import { MovimientosService } from '../movimientos/movimientos.service';
import { InventariosService } from '../inventarios/inventarios.service';
import { BodegasService } from '../bodegas/bodegas.service';
import { RolesService } from '../roles/roles.service';

describe('UsersService', () => {
  let service: UsersService;
  let _repository: Repository<User>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockGruposService = {
    findOrCreateGrupoGeneral: jest.fn(),
    findOrCreateGrupoSede: jest.fn(),
    findOrCreateGrupoBodega: jest.fn(),
  };

  const mockUsuariosGruposService = {
    agregarUsuarioGrupo: jest.fn(),
  };

  const mockInventarioTecnicoService = {};
  const mockMovimientosService = {};
  const mockInventariosService = {};
  const mockBodegasService = {};
  const mockRolesService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: GruposService,
          useValue: mockGruposService,
        },
        {
          provide: UsuariosGruposService,
          useValue: mockUsuariosGruposService,
        },
        {
          provide: InventarioTecnicoService,
          useValue: mockInventarioTecnicoService,
        },
        {
          provide: MovimientosService,
          useValue: mockMovimientosService,
        },
        {
          provide: InventariosService,
          useValue: mockInventariosService,
        },
        {
          provide: BodegasService,
          useValue: mockBodegasService,
        },
        {
          provide: RolesService,
          useValue: mockRolesService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    _repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('should return user when exists', async () => {
      const mockUser = {
        usuarioId: 1,
        usuarioNombre: 'Test',
        usuarioApellido: 'User',
        usuarioCorreo: 'test@example.com',
      };
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(1);

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { usuarioId: 1 },
        relations: ['usuarioRol', 'sede', 'bodega'],
      });
    });
  });

  describe('updateEstado', () => {
    it('should update user estado', async () => {
      const mockUser = {
        usuarioId: 1,
        usuarioEstado: true,
      };
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue({ ...mockUser, usuarioEstado: false });

      const result = await service.updateEstado(1, false);

      expect(result.usuarioEstado).toBe(false);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });
});
