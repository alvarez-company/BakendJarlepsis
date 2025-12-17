import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { Categoria } from './categoria.entity';
import { HasMaterialsException } from '../../common/exceptions/business.exception';

describe('CategoriasService', () => {
  let service: CategoriasService;
  let repository: Repository<Categoria>;

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
        CategoriasService,
        {
          provide: getRepositoryToken(Categoria),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CategoriasService>(CategoriasService);
    repository = module.get<Repository<Categoria>>(getRepositoryToken(Categoria));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('remove', () => {
    it('should throw HasMaterialsException when category has materials', async () => {
      const mockCategoria = {
        categoriaId: 1,
        categoriaNombre: 'Test',
        materiales: [{ materialId: 1 }, { materialId: 2 }],
      };
      mockRepository.findOne.mockResolvedValue(mockCategoria);

      await expect(service.remove(1)).rejects.toThrow(HasMaterialsException);
    });

    it('should remove category when no dependencies', async () => {
      const mockCategoria = {
        categoriaId: 1,
        categoriaNombre: 'Test',
        materiales: [],
      };
      mockRepository.findOne.mockResolvedValue(mockCategoria);
      mockRepository.remove.mockResolvedValue(mockCategoria);

      await service.remove(1);

      expect(mockRepository.remove).toHaveBeenCalledWith(mockCategoria);
    });
  });
});

