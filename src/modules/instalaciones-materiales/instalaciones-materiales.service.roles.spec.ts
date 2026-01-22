import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InstalacionesMaterialesService } from './instalaciones-materiales.service';
import { InstalacionMaterial } from './instalacion-material.entity';
import { InstalacionesService } from '../instalaciones/instalaciones.service';
import { InventarioTecnicoService } from '../inventario-tecnico/inventario-tecnico.service';
import { NumerosMedidorService } from '../numeros-medidor/numeros-medidor.service';
import { MaterialesService } from '../materiales/materiales.service';

describe('InstalacionesMaterialesService - Aprobación de Materiales', () => {
  let service: InstalacionesMaterialesService;
  let mockRepository: any;

  const mockInstalacionMaterial = {
    instalacionMaterialId: 1,
    instalacionId: 1,
    materialId: 1,
    cantidad: 10,
    materialAprobado: null, // Pendiente
  };

  beforeEach(async () => {
    mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstalacionesMaterialesService,
        {
          provide: getRepositoryToken(InstalacionMaterial),
          useValue: mockRepository,
        },
        {
          provide: InstalacionesService,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: InventarioTecnicoService,
          useValue: {},
        },
        {
          provide: NumerosMedidorService,
          useValue: {},
        },
        {
          provide: MaterialesService,
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<InstalacionesMaterialesService>(InstalacionesMaterialesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('aprobarMaterial', () => {
    it('should approve material correctly', async () => {
      mockRepository.findOne.mockResolvedValue(mockInstalacionMaterial);
      mockRepository.save.mockResolvedValue({
        ...mockInstalacionMaterial,
        materialAprobado: true,
      });

      const result = await service.aprobarMaterial(1, true);

      expect(result.materialAprobado).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          materialAprobado: true,
        }),
      );
    });

    it('should disapprove material correctly', async () => {
      const approvedMaterial = {
        ...mockInstalacionMaterial,
        materialAprobado: true,
      };

      mockRepository.findOne.mockResolvedValue(approvedMaterial);
      mockRepository.save.mockResolvedValue({
        ...approvedMaterial,
        materialAprobado: false,
      });

      const result = await service.aprobarMaterial(1, false);

      expect(result.materialAprobado).toBe(false);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          materialAprobado: false,
        }),
      );
    });

    it('should handle approval toggle correctly', async () => {
      // Start with null (pending)
      mockRepository.findOne.mockResolvedValue(mockInstalacionMaterial);
      mockRepository.save.mockResolvedValue({
        ...mockInstalacionMaterial,
        materialAprobado: true,
      });

      const result1 = await service.aprobarMaterial(1, true);
      expect(result1.materialAprobado).toBe(true);

      // Toggle to false
      mockRepository.findOne.mockResolvedValue({
        ...mockInstalacionMaterial,
        materialAprobado: true,
      });
      mockRepository.save.mockResolvedValue({
        ...mockInstalacionMaterial,
        materialAprobado: false,
      });

      const result2 = await service.aprobarMaterial(1, false);
      expect(result2.materialAprobado).toBe(false);
    });
  });
});
