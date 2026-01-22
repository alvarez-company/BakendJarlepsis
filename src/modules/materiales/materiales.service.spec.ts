import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { MaterialesService } from './materiales.service';
import { Material } from './material.entity';
import { MaterialBodega } from './material-bodega.entity';
import { InventariosService } from '../inventarios/inventarios.service';
import { InventarioTecnicoService } from '../inventario-tecnico/inventario-tecnico.service';
import { NumerosMedidorService } from '../numeros-medidor/numeros-medidor.service';
import { AuditoriaInventarioService } from '../auditoria-inventario/auditoria-inventario.service';

describe('MaterialesService', () => {
  let service: MaterialesService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
  };

  const mockMaterialBodegaRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total: '150' }),
    })),
  };

  const mockInventariosService = {};
  const mockInventarioTecnicoService = {
    findByMaterial: jest.fn().mockResolvedValue([]),
  };
  const mockNumerosMedidorService = {};
  const mockAuditoriaInventarioService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialesService,
        {
          provide: getRepositoryToken(Material),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(MaterialBodega),
          useValue: mockMaterialBodegaRepository,
        },
        {
          provide: InventariosService,
          useValue: mockInventariosService,
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
          provide: AuditoriaInventarioService,
          useValue: mockAuditoriaInventarioService,
        },
      ],
    }).compile();

    service = module.get<MaterialesService>(MaterialesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ajustarStock', () => {
    it('should adjust stock correctly', async () => {
      const mockMaterial = {
        materialId: 1,
        materialStock: 100,
      };
      const mockMaterialActualizado = {
        materialId: 1,
        materialStock: 150,
      };
      const mockMaterialBodega = {
        materialBodegaId: 1,
        materialId: 1,
        bodegaId: 1,
        stock: 100,
      };
      // Primera llamada a findOne para obtener el material antes
      // Segunda llamada a findOne para obtener el material después del ajuste
      mockRepository.findOne
        .mockResolvedValueOnce(mockMaterial)
        .mockResolvedValueOnce(mockMaterialActualizado);
      mockMaterialBodegaRepository.findOne.mockResolvedValue(mockMaterialBodega);
      mockMaterialBodegaRepository.create.mockReturnValue({ materialId: 1, bodegaId: 1, stock: 0 });
      mockMaterialBodegaRepository.save.mockResolvedValue({ ...mockMaterialBodega, stock: 150 });
      mockRepository.save.mockResolvedValue({ ...mockMaterial, materialStock: 150 });

      const result = await service.ajustarStock(1, 50, 1);

      expect(result.materialStock).toBe(150);
      expect(mockRepository.update).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when material does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
});
