import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { InstalacionesService } from './instalaciones.service';
import { Instalacion } from './instalacion.entity';
import { UsersService } from '../users/users.service';
import { MovimientosService } from '../movimientos/movimientos.service';
import { InstalacionesMaterialesService } from '../instalaciones-materiales/instalaciones-materiales.service';

describe('InstalacionesService - Permisos', () => {
  let service: InstalacionesService;
  let usersService: UsersService;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
  };

  const mockMovimientosService = {
    findByInstalacion: jest.fn(),
  };

  const mockInstalacionesMaterialesService = {
    findByInstalacion: jest.fn(),
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
      ],
    }).compile();

    service = module.get<InstalacionesService>(InstalacionesService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('update - Permisos', () => {
    const mockInstalacion = {
      instalacionId: 1,
      estado: 'asignada',
      identificadorUnico: 'INST-001',
    };

    beforeEach(() => {
      mockRepository.findOne.mockResolvedValue(mockInstalacion);
      mockRepository.save.mockResolvedValue(mockInstalacion);
    });

    it('should allow superadmin to update installation', async () => {
      const user = { usuarioRol: { rolTipo: 'superadmin' }, usuarioId: 1 };
      mockUsersService.findOne.mockResolvedValue(user);

      await expect(
        service.update(1, { instalacionCodigo: 'INST-002' }, 1, user)
      ).resolves.toBeDefined();
    });

    it('should allow bodega-internas to update installation', async () => {
      const user = { usuarioRol: { rolTipo: 'bodega-internas' }, usuarioId: 1 };
      mockUsersService.findOne.mockResolvedValue(user);

      await expect(
        service.update(1, { instalacionCodigo: 'INST-002' }, 1, user)
      ).resolves.toBeDefined();
    });

    it('should allow bodega-redes to update installation', async () => {
      const user = { usuarioRol: { rolTipo: 'bodega-redes' }, usuarioId: 1 };
      mockUsersService.findOne.mockResolvedValue(user);

      await expect(
        service.update(1, { instalacionCodigo: 'INST-002' }, 1, user)
      ).resolves.toBeDefined();
    });

    it('should deny almacenista from updating installation', async () => {
      const user = { usuarioRol: { rolTipo: 'almacenista' }, usuarioId: 1 };
      mockUsersService.findOne.mockResolvedValue(user);

      await expect(
        service.update(1, { instalacionCodigo: 'INST-002' }, 1, user)
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(1, { instalacionCodigo: 'INST-002' }, 1, user)
      ).rejects.toThrow('No tienes permisos para editar instalaciones');
    });

    it('should deny administrador from updating installation', async () => {
      const user = { usuarioRol: { rolTipo: 'administrador' }, usuarioId: 1 };
      mockUsersService.findOne.mockResolvedValue(user);

      await expect(
        service.update(1, { instalacionCodigo: 'INST-002' }, 1, user)
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(1, { instalacionCodigo: 'INST-002' }, 1, user)
      ).rejects.toThrow('No tienes permisos para editar instalaciones');
    });
  });

  describe('remove - Permisos', () => {
    const mockInstalacion = {
      instalacionId: 1,
      estado: 'asignada',
    };

    beforeEach(() => {
      mockRepository.findOne.mockResolvedValue(mockInstalacion);
      mockRepository.remove.mockResolvedValue(mockInstalacion);
      mockMovimientosService.findByInstalacion.mockResolvedValue([]);
      mockInstalacionesMaterialesService.findByInstalacion.mockResolvedValue([]);
    });

    it('should allow superadmin to delete installation', async () => {
      const user = { usuarioRol: { rolTipo: 'superadmin' }, usuarioId: 1 };
      mockUsersService.findOne.mockResolvedValue(user);

      await expect(service.remove(1, 1)).resolves.toBeUndefined();
    });

    it('should allow bodega-internas to delete installation', async () => {
      const user = { usuarioRol: { rolTipo: 'bodega-internas' }, usuarioId: 1 };
      mockUsersService.findOne.mockResolvedValue(user);

      await expect(service.remove(1, 1)).resolves.toBeUndefined();
    });

    it('should deny almacenista from deleting installation', async () => {
      const user = { usuarioRol: { rolTipo: 'almacenista' }, usuarioId: 1 };
      mockUsersService.findOne.mockResolvedValue(user);

      await expect(service.remove(1, 1)).rejects.toThrow(BadRequestException);
      await expect(service.remove(1, 1)).rejects.toThrow('No tienes permisos para eliminar instalaciones');
    });
  });

  describe('actualizarEstado - Permisos', () => {
    const mockInstalacion = {
      instalacionId: 1,
      estado: 'asignada',
    };

    beforeEach(() => {
      mockRepository.findOne.mockResolvedValue(mockInstalacion);
      mockRepository.save.mockResolvedValue({ ...mockInstalacion, estado: 'en-proceso' });
    });

    it('should allow superadmin to change installation status', async () => {
      const user = { usuarioRol: { rolTipo: 'superadmin' }, usuarioId: 1 };
      mockUsersService.findOne.mockResolvedValue(user);

      await expect(service.actualizarEstado(1, 'en-proceso' as any, 1)).resolves.toBeDefined();
    });

    it('should deny almacenista from changing installation status', async () => {
      const user = { usuarioRol: { rolTipo: 'almacenista' }, usuarioId: 1 };
      mockUsersService.findOne.mockResolvedValue(user);

      await expect(service.actualizarEstado(1, 'en-proceso' as any, 1)).rejects.toThrow(BadRequestException);
      await expect(service.actualizarEstado(1, 'en-proceso' as any, 1)).rejects.toThrow('No tienes permisos para cambiar el estado de instalaciones');
    });
  });
});

