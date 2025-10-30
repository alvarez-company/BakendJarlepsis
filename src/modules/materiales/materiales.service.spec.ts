import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { MaterialesService } from './materiales.service';
import { Material } from './material.entity';

describe('MaterialesService', () => {
  let service: MaterialesService;
  let repository: Repository<Material>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialesService,
        {
          provide: getRepositoryToken(Material),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<MaterialesService>(MaterialesService);
    repository = module.get<Repository<Material>>(getRepositoryToken(Material));
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
      mockRepository.findOne.mockResolvedValue(mockMaterial);
      mockRepository.save.mockResolvedValue({ ...mockMaterial, materialStock: 150 });

      const result = await service.ajustarStock(1, 50);

      expect(result.materialStock).toBe(150);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when material does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
});

