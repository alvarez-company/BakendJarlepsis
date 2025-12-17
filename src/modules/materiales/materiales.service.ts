import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from './material.entity';
import { MaterialBodega } from './material-bodega.entity';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { InventariosService } from '../inventarios/inventarios.service';
import { InventarioTecnicoService } from '../inventario-tecnico/inventario-tecnico.service';
import { NumerosMedidorService } from '../numeros-medidor/numeros-medidor.service';

@Injectable()
export class MaterialesService {
  constructor(
    @InjectRepository(Material)
    private materialesRepository: Repository<Material>,
    @InjectRepository(MaterialBodega)
    private materialesBodegasRepository: Repository<MaterialBodega>,
    private inventariosService: InventariosService,
    @Inject(forwardRef(() => InventarioTecnicoService))
    private inventarioTecnicoService: InventarioTecnicoService,
    @Inject(forwardRef(() => NumerosMedidorService))
    private numerosMedidorService: NumerosMedidorService,
  ) {}

  async create(createMaterialDto: CreateMaterialDto, usuarioId?: number): Promise<Material> {
    console.error('=== INICIANDO CREACIÓN DE MATERIAL (ERROR STREAM) ===');
    console.error('Payload recibido - inventarioId:', createMaterialDto.inventarioId);
    console.error('Payload recibido - bodegas:', JSON.stringify(createMaterialDto.bodegas));
    
    try {
      const { bodegas = [], materialStock, inventarioId, ...rest } = createMaterialDto;

      const materialData: any = {
        ...rest,
        materialStock: Number(materialStock || 0),
        usuarioRegistra: usuarioId,
      };

      let finalInventarioId: number | null = null;

      // Si no se proporciona inventarioId, crear uno automáticamente
      // Verificar explícitamente undefined, null, y valores inválidos
      if (inventarioId === undefined || inventarioId === null || inventarioId <= 0) {
        // Usar la primera bodega de la distribución para crear el inventario
        let bodegaIdForInventario: number | null = null;
        
        if (bodegas.length > 0 && bodegas[0]?.bodegaId) {
          bodegaIdForInventario = bodegas[0].bodegaId;
        } else {
          // Si no hay bodegas, obtener la primera bodega disponible
          const defaultBodega = await this.materialesRepository.manager
            .createQueryBuilder()
            .select('bodega.bodegaId', 'bodegaId')
            .from('bodegas', 'bodega')
            .where('bodega.bodegaEstado = :estado', { estado: true })
            .orderBy('bodega.bodegaId', 'ASC')
            .getRawOne<{ bodegaId: number }>();
          
          if (defaultBodega?.bodegaId) {
            bodegaIdForInventario = defaultBodega.bodegaId;
          } else {
            console.error('No se encontró ninguna bodega activa para crear el inventario');
          }
        }

        if (bodegaIdForInventario) {
          try {
            // Crear inventario automáticamente para el material
            const nuevoInventario = await this.inventariosService.create({
              inventarioNombre: `Inventario - ${rest.materialNombre}`,
              inventarioDescripcion: `Inventario generado automáticamente para el material: ${rest.materialNombre}`,
              bodegaId: bodegaIdForInventario,
              inventarioEstado: true,
            });
            finalInventarioId = nuevoInventario.inventarioId;
            materialData.inventarioId = finalInventarioId;
          } catch (error) {
            console.error('Error al crear inventario automático:', error);
            throw new Error(`No se pudo crear el inventario automático para el material. ${error instanceof Error ? error.message : String(error)}`);
          }
        } else {
          throw new Error('No se pudo crear el inventario automático: no hay bodegas disponibles. Debe asignar al menos una bodega al material.');
        }
      } else {
        // Si se proporciona inventarioId, usarlo
        finalInventarioId = inventarioId;
        materialData.inventarioId = inventarioId;
      }

      // Verificar que inventarioId esté presente antes de guardar
      if (!materialData.inventarioId || materialData.inventarioId <= 0) {
        throw new Error('El inventarioId es requerido. No se pudo crear automáticamente y no se proporcionó uno.');
      }
      
      const material = this.materialesRepository.create(materialData);
      const savedResult = await this.materialesRepository.save(material);
      
      // TypeORM save() puede devolver un array si se pasa un array, pero aquí siempre es un objeto
      const savedMaterial = Array.isArray(savedResult) ? savedResult[0] : savedResult;

      await this.applyBodegaDistribution(savedMaterial.materialId, bodegas, materialStock, finalInventarioId || null);

      return this.findOne(savedMaterial.materialId);
    } catch (error) {
      console.error('Error al crear material:', error);
      console.error('Payload recibido:', JSON.stringify(createMaterialDto, null, 2));
      throw error;
    }
  }

  async findAll(user?: any): Promise<Material[]> {
    try {
      const allMateriales = await this.materialesRepository.find({
        relations: ['categoria', 'proveedor', 'inventario', 'materialBodegas', 'materialBodegas.bodega', 'materialBodegas.bodega.sede', 'unidadMedida'],
      });
    
      // SuperAdmin ve todo
      if (user?.usuarioRol?.rolTipo === 'superadmin' || user?.role === 'superadmin') {
        return allMateriales;
      }
      
      // Admin ve materiales de su bodega
      if (user?.usuarioRol?.rolTipo === 'admin' || user?.role === 'admin') {
        return allMateriales.filter(material => {
          // Verificar si el material tiene stock en la bodega del usuario
          if (material.materialBodegas && material.materialBodegas.length > 0) {
            return material.materialBodegas.some(mb => mb.bodegaId === user.usuarioBodega);
          }
          return material.inventario?.bodegaId === user.usuarioBodega;
        });
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
      relations: ['categoria', 'proveedor', 'inventario', 'materialBodegas', 'materialBodegas.bodega', 'materialBodegas.bodega.sede', 'unidadMedida'],
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
    const { bodegas, materialStock, inventarioId, ...rest } = updateMaterialDto;

    const updateData: any = {
      ...rest,
      materialStock:
        materialStock !== undefined ? Number(materialStock) : material.materialStock,
    };

    // Solo incluir inventarioId si tiene un valor válido
    // No incluir si es null/undefined/0 para evitar el error "Column cannot be null"
    if (inventarioId !== undefined) {
      if (inventarioId && inventarioId > 0) {
        updateData.inventarioId = inventarioId;
      }
      // Si inventarioId es null o 0, no lo incluimos (dejará el valor actual)
    }
    // Si no se proporciona inventarioId, no lo incluimos en updateData
    // (Object.assign mantendrá el valor actual de material.inventarioId)

    Object.assign(material, updateData);
    const updated = await this.materialesRepository.save(material);

    if (bodegas) {
      await this.materialesBodegasRepository.delete({ materialId: material.materialId });
      await this.applyBodegaDistribution(material.materialId, bodegas, materialStock, updateData.inventarioId || null);
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

  /**
   * Método público para sincronizar el stock de un material.
   * Útil cuando se necesita forzar una sincronización después de cambios externos.
   */
  async sincronizarStock(materialId: number): Promise<void> {
    await this.syncMaterialStock(materialId);
  }

  /**
   * Ajusta el stock general del material sin asignarlo a una bodega específica.
   * Esto se usa cuando el stock va directamente a la sede.
   * 
   * IMPORTANTE: Este método NO debe modificar directamente materialStock.
   * En su lugar, debe crear un registro en materiales_bodegas con bodegaId = null
   * o usar una bodega especial para "sede", y luego sincronizar.
   * 
   * Por ahora, actualizamos materialStock directamente pero luego sincronizamos
   * para asegurar consistencia.
   */
  async ajustarStockSede(id: number, cantidad: number): Promise<Material> {
    const cantidadNumerica = Number(cantidad) || 0;
    
    // Obtener el material actual
    const material = await this.findOne(id);
    const stockActual = Number(material.materialStock || 0);
    const nuevoStock = Math.max(0, stockActual + cantidadNumerica);
    
    // Actualizar el stock total
    await this.materialesRepository.update(id, {
      materialStock: nuevoStock
    });
    
    // IMPORTANTE: Sincronizar después para asegurar que el stock total
    // refleje correctamente la suma de bodegas + técnicos
    // Si el nuevoStock es diferente a la suma real, la sincronización lo corregirá
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
      relations: ['categoria', 'proveedor', 'inventario', 'unidadMedida'],
    });
  }

  async createVariante(
    materialOriginal: Material,
    nuevoProveedorId: number,
    inventarioId?: number | null,
    precio?: number
  ): Promise<Material> {
    const varianteData = {
      categoriaId: materialOriginal.categoriaId,
      proveedorId: nuevoProveedorId,
      inventarioId: inventarioId || null,
      materialCodigo: materialOriginal.materialCodigo,
      materialNombre: materialOriginal.materialNombre,
      materialDescripcion: materialOriginal.materialDescripcion,
      materialStock: 0,
      materialPrecio: precio || materialOriginal.materialPrecio,
      unidadMedidaId: materialOriginal.unidadMedidaId,
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
    // Buscar cualquier material con ese código
    const materiales = await this.materialesRepository.find({
      where: { materialCodigo: codigo },
      relations: ['categoria', 'proveedor', 'inventario'],
      order: { fechaCreacion: 'ASC' },
    });

    if (materiales.length === 0) {
      return null;
    }

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
  }

  async getStockTotal(codigo: string): Promise<number> {
    // Buscar todos los materiales con ese código y sumar el stock
    const materiales = await this.materialesRepository.find({
      where: { materialCodigo: codigo },
    });
    return materiales.reduce((total, material) => total + Number(material.materialStock || 0), 0);
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
      
      try {
        // Verificar si ya existe un registro para este material y bodega
        const existingRecord = await this.materialesBodegasRepository.findOne({
          where: { materialId, bodegaId: entry.bodegaId },
        });

        if (existingRecord) {
          // Actualizar el registro existente
          existingRecord.stock = Number(entry.stock ?? 0);
          existingRecord.precioPromedio =
            entry.precioPromedio !== undefined ? Number(entry.precioPromedio) : null;
          await this.materialesBodegasRepository.save(existingRecord);
        } else {
          // Crear un nuevo registro
          const record = this.materialesBodegasRepository.create({
            materialId,
            bodegaId: entry.bodegaId,
            stock: Number(entry.stock ?? 0),
            precioPromedio:
              entry.precioPromedio !== undefined ? Number(entry.precioPromedio) : null,
          });
          await this.materialesBodegasRepository.save(record);
        }
      } catch (error) {
        console.error(`Error al guardar distribución de bodega ${entry.bodegaId} para material ${materialId}:`, error);
        throw error;
      }
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

  /**
   * Sincroniza el stock total del material sumando:
   * - Stock en bodegas (materiales_bodegas)
   * - Stock en técnicos (inventario_tecnicos)
   * 
   * El stock en sede se calcula como: materialStock - stockBodegas - stockTecnicos
   */
  private async syncMaterialStock(materialId: number): Promise<void> {
    // Sumar stock en bodegas
    const stockBodegasResult = await this.materialesBodegasRepository
      .createQueryBuilder('mb')
      .select('COALESCE(SUM(mb.stock), 0)', 'total')
      .where('mb.materialId = :materialId', { materialId })
      .getRawOne<{ total: string }>();

    const stockBodegas = Number(stockBodegasResult?.total || 0);

    // Sumar stock en técnicos
    let stockTecnicos = 0;
    try {
      const inventariosTecnicos = await this.inventarioTecnicoService.findByMaterial(materialId);
      stockTecnicos = inventariosTecnicos.reduce((sum, inv) => {
        return sum + Number(inv.cantidad || 0);
      }, 0);
    } catch (error) {
      console.error(`Error al calcular stock en técnicos para material ${materialId}:`, error);
      // Continuar con stockTecnicos = 0 si hay error
    }

    // El stock total es la suma de bodegas + técnicos
    const stockTotal = stockBodegas + stockTecnicos;

    await this.materialesRepository.update(materialId, {
      materialStock: stockTotal,
    });
  }

  async duplicate(id: number, usuarioId?: number): Promise<Material> {
    const materialOriginal = await this.findOne(id);
    
    // Generar nuevo código único
    let nuevoCodigo = `${materialOriginal.materialCodigo}-COPIA`;
    let contador = 1;
    while (await this.findByCodigo(nuevoCodigo)) {
      nuevoCodigo = `${materialOriginal.materialCodigo}-COPIA-${contador}`;
      contador++;
    }

    // Obtener distribución de bodegas del material original
    const bodegasOriginales = materialOriginal.materialBodegas || [];
    const bodegasDuplicadas = bodegasOriginales.map((mb: any) => ({
      bodegaId: mb.bodegaId,
      stock: 0, // Stock inicial en 0 para el material duplicado
      precioPromedio: mb.precioPromedio || null,
    }));

    // Crear el material duplicado
    const materialDuplicado = {
      categoriaId: materialOriginal.categoriaId,
      proveedorId: materialOriginal.proveedorId,
      inventarioId: materialOriginal.inventarioId,
      materialCodigo: nuevoCodigo,
      materialNombre: `${materialOriginal.materialNombre} (Copia)`,
      materialDescripcion: materialOriginal.materialDescripcion || null,
      materialStock: 0, // Stock inicial en 0
      materialPrecio: materialOriginal.materialPrecio,
      unidadMedidaId: materialOriginal.unidadMedidaId || null,
      materialMarca: materialOriginal.materialMarca || null,
      materialModelo: materialOriginal.materialModelo || null,
      materialSerial: materialOriginal.materialSerial || null,
      materialFoto: materialOriginal.materialFoto || null,
      materialEstado: materialOriginal.materialEstado,
      bodegas: bodegasDuplicadas.length > 0 ? bodegasDuplicadas : undefined,
    };

    return this.create(materialDuplicado as CreateMaterialDto, usuarioId);
  }

}

