import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from './material.entity';
import { MaterialBodega } from './material-bodega.entity';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';

@Injectable()
export class MaterialesService {
  constructor(
    @InjectRepository(Material)
    private materialesRepository: Repository<Material>,
    @InjectRepository(MaterialBodega)
    private materialesBodegasRepository: Repository<MaterialBodega>,
  ) {}

  async create(createMaterialDto: CreateMaterialDto, usuarioId?: number): Promise<Material> {
    const { bodegas = [], materialStock, ...rest } = createMaterialDto;

    const materialData = {
      ...rest,
      materialStock: Number(materialStock || 0),
      inventarioId:
        rest.inventarioId && rest.inventarioId > 0 ? rest.inventarioId : null,
      usuarioRegistra: usuarioId,
    };

    const material = this.materialesRepository.create(materialData);
    const savedMaterial = await this.materialesRepository.save(material);

    await this.applyBodegaDistribution(savedMaterial.materialId, bodegas, materialStock, materialData.inventarioId);

    return this.findOne(savedMaterial.materialId);
  }

  async findAll(user?: any): Promise<Material[]> {
    try {
      const allMateriales = await this.materialesRepository.find({
        relations: ['categoria', 'proveedor', 'inventario', 'materialBodegas', 'materialBodegas.bodega'],
      });
    
      // SuperAdmin ve todo
      if (user?.usuarioRol?.rolTipo === 'superadmin' || user?.role === 'superadmin') {
        return allMateriales;
      }
      
      // Admin ve materiales de su oficina
      if (user?.usuarioRol?.rolTipo === 'admin' || user?.role === 'admin') {
        return allMateriales.filter(material => material.inventario?.bodega?.oficinaId === user.usuarioOficina);
      }
      
      // Usuario Bodega ve solo materiales de su bodega
      if (user?.usuarioRol?.rolTipo === 'bodega' || user?.role === 'bodega') {
        return allMateriales.filter(material => material.inventario?.bodegaId === user.usuarioBodega);
      }
      
      return allMateriales;
    } catch (error) {
      console.error('Error al obtener materiales:', error);
      throw error;
    }
  }

  async findOne(id: number): Promise<Material> {
    const material = await this.materialesRepository.findOne({
      where: { materialId: id },
      relations: ['categoria', 'proveedor', 'inventario', 'materialBodegas', 'materialBodegas.bodega'],
    });
    if (!material) {
      throw new NotFoundException(`Material con ID ${id} no encontrado`);
    }
    return material;
  }

  async findByCodigo(codigo: string): Promise<Material | null> {
    return this.materialesRepository.findOne({
      where: { materialCodigo: codigo },
      relations: ['categoria', 'proveedor', 'inventario'],
    });
  }

  async update(id: number, updateMaterialDto: UpdateMaterialDto): Promise<Material> {
    const material = await this.findOne(id);
    // Convertir inventarioId de 0 a null para campos opcionales
    const { bodegas, materialStock, ...rest } = updateMaterialDto;

    const updateData = {
      ...rest,
      materialStock:
        materialStock !== undefined ? Number(materialStock) : material.materialStock,
      inventarioId:
        updateMaterialDto.inventarioId !== undefined
          ? updateMaterialDto.inventarioId && updateMaterialDto.inventarioId > 0
            ? updateMaterialDto.inventarioId
            : null
          : material.inventarioId,
    };

    Object.assign(material, updateData);
    const updated = await this.materialesRepository.save(material);

    if (bodegas) {
      await this.materialesBodegasRepository.delete({ materialId: material.materialId });
      await this.applyBodegaDistribution(material.materialId, bodegas, materialStock, updateData.inventarioId);
    } else if (materialStock !== undefined) {
      await this.syncMaterialStock(material.materialId);
    }

    return this.findOne(material.materialId);
  }

  async ajustarStock(id: number, cantidad: number, bodegaId?: number): Promise<Material> {
    if (!bodegaId) {
      throw new Error('Debe especificar la bodega para ajustar el stock.');
    }
    await this.adjustStockForBodega(id, bodegaId, cantidad);
    await this.syncMaterialStock(id);
    return this.findOne(id);
  }

  async actualizarInventarioYPrecio(
    id: number, 
    inventarioId?: number, 
    precio?: number
  ): Promise<Material> {
    const material = await this.findOne(id);
    if (inventarioId !== undefined) {
      material.inventarioId = inventarioId;
    }
    if (precio !== undefined) {
      material.materialPrecio = precio;
    }
    return this.materialesRepository.save(material);
  }

  async remove(id: number): Promise<void> {
    const material = await this.findOne(id);
    await this.materialesRepository.remove(material);
  }

  async findByProveedorAndCodigo(proveedorId: number, codigo: string): Promise<Material | null> {
    return this.materialesRepository.findOne({
      where: { proveedorId, materialCodigo: codigo },
      relations: ['categoria', 'proveedor', 'inventario'],
    });
  }

  async createVariante(
    materialOriginal: Material,
    nuevoProveedorId: number,
    materialPadreId: number,
    inventarioId?: number | null,
    precio?: number
  ): Promise<Material> {
    const varianteData = {
      categoriaId: materialOriginal.categoriaId,
      proveedorId: nuevoProveedorId,
      inventarioId: inventarioId || null,
      materialCodigo: materialOriginal.materialCodigo,
      materialPadreId: materialPadreId,
      materialNombre: materialOriginal.materialNombre,
      materialDescripcion: materialOriginal.materialDescripcion,
      materialStock: 0,
      materialPrecio: precio || materialOriginal.materialPrecio,
      materialUnidadMedida: materialOriginal.materialUnidadMedida,
      materialMarca: materialOriginal.materialMarca,
      materialModelo: materialOriginal.materialModelo,
      materialSerial: materialOriginal.materialSerial,
      materialFoto: materialOriginal.materialFoto,
      materialEstado: materialOriginal.materialEstado,
    };
    const variante = this.materialesRepository.create(varianteData);
    return this.materialesRepository.save(variante);
  }

  async findMaterialFIFO(codigo: string, cantidadNecesaria: number): Promise<Material | null> {
    try {
      // Buscar el material base por código (puede no tener materialPadreId aún)
      const materialBase = await this.materialesRepository
        .createQueryBuilder('material')
        .where('material.materialCodigo = :codigo', { codigo })
        .andWhere('(material.materialPadreId IS NULL OR material.materialPadreId = 0)')
        .getOne();

      if (!materialBase) {
        // Si no encuentra material base, buscar cualquier material con ese código
        const materiales = await this.materialesRepository.find({
          where: { materialCodigo: codigo },
          relations: ['categoria', 'proveedor', 'inventario'],
          order: { fechaCreacion: 'ASC' },
          take: 1,
        });
        if (materiales.length > 0) {
          return materiales[0];
        }
        return null;
      }

      // Buscar todas las variantes (incluyendo el material base)
      const materiales = await this.materialesRepository
        .createQueryBuilder('material')
        .leftJoinAndSelect('material.categoria', 'categoria')
        .leftJoinAndSelect('material.proveedor', 'proveedor')
        .leftJoinAndSelect('material.inventario', 'inventario')
        .where('material.materialId = :materialId', { materialId: materialBase.materialId })
        .orWhere('material.materialPadreId = :materialId', { materialId: materialBase.materialId })
        .orderBy('material.fechaCreacion', 'ASC')
        .getMany();

      // Filtrar solo materiales activos con stock
      const materialesDisponibles = materiales.filter(
        m => m.materialEstado && Number(m.materialStock || 0) > 0
      );

      if (materialesDisponibles.length === 0) {
        return null;
      }

      // Encontrar el material con stock suficiente, empezando por el más antiguo
      for (const material of materialesDisponibles) {
        if (Number(material.materialStock || 0) >= cantidadNecesaria) {
          return material;
        }
      }

      // Si ningún material tiene stock suficiente, devolver el más antiguo con stock
      return materialesDisponibles[0] || null;
    } catch (error) {
      // Si hay error (por ejemplo, columna materialPadreId no existe), buscar cualquier material con ese código
      const materiales = await this.materialesRepository.find({
        where: { materialCodigo: codigo },
        relations: ['categoria', 'proveedor', 'inventario'],
        order: { fechaCreacion: 'ASC' },
        take: 1,
      });
      return materiales.length > 0 ? materiales[0] : null;
    }
  }

  async getStockTotal(codigo: string): Promise<number> {
    try {
      // Buscar el material base por código (puede no tener materialPadreId aún)
      const materialBase = await this.materialesRepository
        .createQueryBuilder('material')
        .where('material.materialCodigo = :codigo', { codigo })
        .andWhere('(material.materialPadreId IS NULL OR material.materialPadreId = 0)')
        .getOne();

      if (!materialBase) {
        // Si no encuentra material base, buscar todos los materiales con ese código y sumar
        const materiales = await this.materialesRepository.find({
          where: { materialCodigo: codigo },
        });
        return materiales.reduce((total, material) => total + Number(material.materialStock || 0), 0);
      }

      // Buscar todas las variantes (incluyendo el material base)
      const materiales = await this.materialesRepository
        .createQueryBuilder('material')
        .where('material.materialId = :materialId', { materialId: materialBase.materialId })
        .orWhere('material.materialPadreId = :materialId', { materialId: materialBase.materialId })
        .getMany();

      // Sumar todos los stocks
      return materiales.reduce((total, material) => total + Number(material.materialStock || 0), 0);
    } catch (error) {
      // Si hay error (por ejemplo, columna materialPadreId no existe), solo buscar por código
      const materiales = await this.materialesRepository.find({
        where: { materialCodigo: codigo },
      });
      return materiales.reduce((total, material) => total + Number(material.materialStock || 0), 0);                                                            
    }
  }

  private async applyBodegaDistribution(
    materialId: number,
    bodegas: CreateMaterialDto['bodegas'] | undefined,
    fallbackStock?: number,
    inventarioId?: number | null,
  ): Promise<void> {
    let distribution = bodegas || [];

    if (!distribution.length && inventarioId) {
      const inventario = await this.materialesRepository.manager
        .createQueryBuilder()
        .select('inventario.bodegaId', 'bodegaId')
        .from('inventarios', 'inventario')
        .where('inventario.inventarioId = :inventarioId', { inventarioId })
        .getRawOne<{ bodegaId: number }>();

      if (inventario?.bodegaId) {
        distribution = [
          {
            bodegaId: inventario.bodegaId,
            stock: Number(fallbackStock || 0),
            precioPromedio: undefined,
          },
        ];
      }
    }

    if (!distribution.length && fallbackStock) {
      const defaultBodega = await this.materialesRepository.manager
        .createQueryBuilder()
        .select('bodega.bodegaId', 'bodegaId')
        .from('bodegas', 'bodega')
        .orderBy('bodega.bodegaId', 'ASC')
        .getRawOne<{ bodegaId: number }>();

      if (defaultBodega?.bodegaId) {
        distribution = [
          {
            bodegaId: defaultBodega.bodegaId,
            stock: Number(fallbackStock || 0),
            precioPromedio: undefined,
          },
        ];
      }
    }

    for (const entry of distribution) {
      if (!entry?.bodegaId) {
        continue;
      }
      const record = this.materialesBodegasRepository.create({
        materialId,
        bodegaId: entry.bodegaId,
        stock: Number(entry.stock ?? 0),
        precioPromedio:
          entry.precioPromedio !== undefined ? Number(entry.precioPromedio) : null,
      });
      await this.materialesBodegasRepository.save(record);
    }

    await this.syncMaterialStock(materialId);
  }

  private async adjustStockForBodega(
    materialId: number,
    bodegaId: number,
    cantidad: number,
  ): Promise<MaterialBodega> {
    let registro = await this.materialesBodegasRepository.findOne({
      where: { materialId, bodegaId },
    });

    if (!registro) {
      registro = this.materialesBodegasRepository.create({
        materialId,
        bodegaId,
        stock: 0,
      });
    }

    registro.stock = Number(registro.stock || 0) + Number(cantidad || 0);
    if (registro.stock < 0) {
      throw new Error('El stock no puede quedar negativo para la bodega seleccionada.');
    }

    return this.materialesBodegasRepository.save(registro);
  }

  private async syncMaterialStock(materialId: number): Promise<void> {
    const result = await this.materialesBodegasRepository
      .createQueryBuilder('mb')
      .select('COALESCE(SUM(mb.stock), 0)', 'total')
      .where('mb.materialId = :materialId', { materialId })
      .getRawOne<{ total: string }>();

    await this.materialesRepository.update(materialId, {
      materialStock: Number(result?.total || 0),
    });
  }
}

