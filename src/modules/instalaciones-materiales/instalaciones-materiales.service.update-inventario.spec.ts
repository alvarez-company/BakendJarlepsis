import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { InstalacionesMaterialesService } from './instalaciones-materiales.service';
import { InstalacionMaterial } from './instalacion-material.entity';
import { InstalacionesService } from '../instalaciones/instalaciones.service';
import { InventarioTecnicoService } from '../inventario-tecnico/inventario-tecnico.service';
import { NumerosMedidorService } from '../numeros-medidor/numeros-medidor.service';
import { MaterialesService } from '../materiales/materiales.service';

describe('InstalacionesMaterialesService - update inventario técnico', () => {
  let service: InstalacionesMaterialesService;
  let mockRepository: any;
  let mockInstalacionesService: any;
  let mockInventarioTecnicoService: any;
  let mockMaterialesService: any;

  const instalacionMaterialBase: InstalacionMaterial = {
    instalacionMaterialId: 10,
    instalacionId: 1,
    materialId: 5,
    cantidad: 2,
    observaciones: null,
    materialAprobado: null,
    numerosMedidor: [],
    fechaCreacion: new Date(),
    fechaActualizacion: new Date(),
  } as InstalacionMaterial;

  const instalacionConTecnico = {
    instalacionId: 1,
    estado: 'cert',
    usuariosAsignados: [
      {
        usuarioId: 99,
        activo: true,
        usuario: { usuarioId: 99, usuarioRol: { rolTipo: 'tecnico' } },
      },
    ],
  };

  beforeEach(async () => {
    mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockInstalacionesService = {
      findOne: jest.fn().mockResolvedValue(instalacionConTecnico),
    };

    mockInventarioTecnicoService = {
      findByUsuario: jest.fn().mockResolvedValue([
        { inventarioTecnicoId: 1, usuarioId: 99, materialId: 5, cantidad: 0 },
      ]),
      update: jest.fn(),
      create: jest.fn(),
    };

    mockMaterialesService = {
      findOne: jest.fn().mockResolvedValue({ materialId: 5, materialEsMedidor: false }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstalacionesMaterialesService,
        { provide: getRepositoryToken(InstalacionMaterial), useValue: mockRepository },
        { provide: InstalacionesService, useValue: mockInstalacionesService },
        { provide: InventarioTecnicoService, useValue: mockInventarioTecnicoService },
        { provide: NumerosMedidorService, useValue: { findByUsuario: jest.fn(), findByInstalacion: jest.fn() } },
        { provide: MaterialesService, useValue: mockMaterialesService },
      ],
    }).compile();

    service = module.get(InstalacionesMaterialesService);
    jest.spyOn(service, 'findOne').mockResolvedValue({ ...instalacionMaterialBase });
  });

  it('rechaza aumentar cantidad si el técnico no tiene stock adicional', async () => {
    await expect(service.update(10, { cantidad: 3 })).rejects.toThrow(BadRequestException);
    expect(mockRepository.save).not.toHaveBeenCalled();
    expect(mockInventarioTecnicoService.update).not.toHaveBeenCalled();
  });

  it('devuelve unidades al inventario del técnico al disminuir cantidad', async () => {
    mockInventarioTecnicoService.findByUsuario.mockResolvedValue([
      { inventarioTecnicoId: 1, usuarioId: 99, materialId: 5, cantidad: 0 },
    ]);
    mockRepository.save.mockImplementation(async (row) => row);

    const result = await service.update(10, { cantidad: 1 });

    expect(result.cantidad).toBe(1);
    expect(mockInventarioTecnicoService.update).toHaveBeenCalledWith(1, { cantidad: 1 });
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('descuenta del inventario del técnico al aumentar cantidad con stock disponible', async () => {
    mockInventarioTecnicoService.findByUsuario.mockResolvedValue([
      { inventarioTecnicoId: 1, usuarioId: 99, materialId: 5, cantidad: 3 },
    ]);
    mockRepository.save.mockImplementation(async (row) => row);

    await service.update(10, { cantidad: 4 });

    expect(mockInventarioTecnicoService.update).toHaveBeenCalledWith(1, { cantidad: 1 });
    expect(mockRepository.save).toHaveBeenCalled();
  });
});
