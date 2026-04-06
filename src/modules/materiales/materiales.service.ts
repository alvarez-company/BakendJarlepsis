import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from './material.entity';
import { MaterialBodega } from './material-bodega.entity';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { InventariosService } from '../inventarios/inventarios.service';
import { BodegasService } from '../bodegas/bodegas.service';
import { InventarioTecnicoService } from '../inventario-tecnico/inventario-tecnico.service';
import { AuditoriaInventarioService } from '../auditoria-inventario/auditoria-inventario.service';
import { TipoCambioInventario } from '../auditoria-inventario/auditoria-inventario.entity';

@Injectable()
export class MaterialesService {
  constructor(
    @InjectRepository(Material)
    private materialesRepository: Repository<Material>,
    @InjectRepository(MaterialBodega)
    private materialesBodegasRepository: Repository<MaterialBodega>,
    private inventariosService: InventariosService,
    @Inject(forwardRef(() => BodegasService))
    private bodegasService: BodegasService,
    @Inject(forwardRef(() => InventarioTecnicoService))
    private inventarioTecnicoService: InventarioTecnicoService,
    private auditoriaService: AuditoriaInventarioService,
  ) {}

  /** Sede del usuario para catálogo compartido + stock por centro (desde usuarioSede o bodega asignada). */
  private async resolveUsuarioSedeId(user?: any): Promise<number | null> {
    if (!user) return null;
    const rolTipo = (user.usuarioRol?.rolTipo || user.role || '').toLowerCase();
    if (rolTipo === 'superadmin' || rolTipo === 'gerencia') return null;
    if (user.usuarioSede != null && user.usuarioSede !== '') {
      const n = Number(user.usuarioSede);
      if (!Number.isNaN(n) && n > 0) return n;
    }
    if (user.usuarioBodega != null && user.usuarioBodega !== '') {
      try {
        const b = await this.bodegasService.findOne(Number(user.usuarioBodega));
        if (b?.sedeId != null) return Number(b.sedeId);
      } catch {
        /* ignorar */
      }
    }
    return null;
  }

  /** Superadmin/gerencia: cualquier sede; resto: solo su centro (sede o sede de su bodega). */
  private async usuarioPuedeVerStockEnCentro(sedeId: number, user?: any): Promise<boolean> {
    const rolTipo = (user?.usuarioRol?.rolTipo || user?.role || '').toLowerCase();
    if (rolTipo === 'superadmin' || rolTipo === 'gerencia') return true;
    const miSede = await this.resolveUsuarioSedeId(user);
    return miSede != null && Number(miSede) === Number(sedeId);
  }

  /**
   * Stock físico agregado por centro operativo (suma bodegas + inventario técnico).
   * No depende del listado de materiales filtrado por usuario.
   */
  async getStockAcumuladoPorSede(user?: any): Promise<{ sedeId: number; stock: number }[]> {
    const map = new Map<number, number>();

    const fromBodegas = await this.materialesBodegasRepository
      .createQueryBuilder('mb')
      .innerJoin('bodegas', 'b', 'b.bodegaId = mb.bodegaId')
      .select('b.sedeId', 'sedeId')
      .addSelect('COALESCE(SUM(mb.stock), 0)', 'stock')
      .where('b.sedeId IS NOT NULL')
      .groupBy('b.sedeId')
      .getRawMany<{ sedeId: number; stock: string }>();

    for (const r of fromBodegas) {
      const sid = Number(r.sedeId);
      if (!Number.isFinite(sid) || sid <= 0) continue;
      map.set(sid, (map.get(sid) || 0) + Number(r.stock || 0));
    }

    const fromTech = await this.materialesRepository.manager.query<
      Array<{ sedeId: number; stock: string }>
    >(
      `SELECT 
         COALESCE(u.usuarioSede, b.sedeId) AS sedeId,
         COALESCE(SUM(it.cantidad), 0) AS stock
       FROM inventario_tecnicos it
       INNER JOIN usuarios u ON u.usuarioId = it.usuarioId
       LEFT JOIN bodegas b ON b.bodegaId = u.usuarioBodega
       WHERE it.cantidad > 0
         AND COALESCE(u.usuarioSede, b.sedeId) IS NOT NULL
       GROUP BY COALESCE(u.usuarioSede, b.sedeId)`,
    );

    for (const r of fromTech) {
      const sid = Number(r.sedeId);
      if (!Number.isFinite(sid) || sid <= 0) continue;
      map.set(sid, (map.get(sid) || 0) + Number(r.stock || 0));
    }

    const rolTipo = (user?.usuarioRol?.rolTipo || user?.role || '').toLowerCase();
    const verTodos = rolTipo === 'superadmin' || rolTipo === 'gerencia';
    if (verTodos) {
      return Array.from(map.entries())
        .map(([sedeId, stock]) => ({ sedeId, stock }))
        .sort((a, b) => a.sedeId - b.sedeId);
    }

    const miSede = await this.resolveUsuarioSedeId(user);
    if (miSede != null) {
      return [{ sedeId: miSede, stock: map.get(miSede) ?? 0 }];
    }
    return [];
  }

  async create(createMaterialDto: CreateMaterialDto, usuarioId?: number): Promise<Material> {
    console.error('=== INICIANDO CREACIÓN DE MATERIAL (ERROR STREAM) ===');
    console.error('Payload recibido - inventarioId:', createMaterialDto.inventarioId);
    console.error('Payload recibido - bodegas:', JSON.stringify(createMaterialDto.bodegas));

    try {
      const { bodegas = [], materialStock, inventarioId, ...rest } = createMaterialDto;

      // Validar que el código del material no esté duplicado
      const materialExistentePorCodigo = await this.findByCodigo(rest.materialCodigo);
      if (materialExistentePorCodigo) {
        throw new ConflictException(
          `El código de material '${rest.materialCodigo}' ya está en uso. Los códigos deben ser únicos.`,
        );
      }

      // Validar que el nombre del material no esté duplicado
      const materialExistentePorNombre = await this.findByNombre(rest.materialNombre);
      if (materialExistentePorNombre) {
        throw new ConflictException(
          `El nombre de material '${rest.materialNombre}' ya está en uso. Los nombres deben ser únicos.`,
        );
      }

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
            throw new Error(
              `No se pudo crear el inventario automático para el material. ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        } else {
          throw new Error(
            'No se pudo crear el inventario automático: no hay bodegas disponibles. Debe asignar al menos una bodega al material.',
          );
        }
      } else {
        // Si se proporciona inventarioId, usarlo
        finalInventarioId = inventarioId;
        materialData.inventarioId = inventarioId;
      }

      // Verificar que inventarioId esté presente antes de guardar
      if (!materialData.inventarioId || materialData.inventarioId <= 0) {
        throw new Error(
          'El inventarioId es requerido. No se pudo crear automáticamente y no se proporcionó uno.',
        );
      }

      const material = this.materialesRepository.create(materialData);
      const savedResult = await this.materialesRepository.save(material);

      // TypeORM save() puede devolver un array si se pasa un array, pero aquí siempre es un objeto
      const savedMaterial = Array.isArray(savedResult) ? savedResult[0] : savedResult;

      await this.applyBodegaDistribution(
        savedMaterial.materialId,
        bodegas,
        materialStock,
        finalInventarioId || null,
      );

      // Registrar en auditoría
      if (usuarioId) {
        await this.auditoriaService.registrarCambio({
          materialId: savedMaterial.materialId,
          tipoCambio: TipoCambioInventario.CREACION_MATERIAL,
          usuarioId,
          descripcion: `Creación de material: ${rest.materialNombre}`,
          datosNuevos: {
            materialCodigo: rest.materialCodigo,
            materialNombre: rest.materialNombre,
            materialStock: materialStock || 0,
            categoriaId: rest.categoriaId,
            proveedorId: rest.proveedorId,
          },
          cantidadNueva: materialStock || 0,
        });
      }

      return this.findOne(savedMaterial.materialId);
    } catch (error) {
      console.error('Error al crear material:', error);
      console.error('Payload recibido:', JSON.stringify(createMaterialDto, null, 2));
      throw error;
    }
  }

  /**
   * @param vistaCentroOperativoId Si viene informado (y el usuario puede ver ese centro), se filtra stock y bodegas a esa sede.
   *        Útil en Empresa → inventario por sede sin depender del alcance del usuario en el listado global.
   */
  async findAll(user?: any, vistaCentroOperativoId?: number): Promise<Material[]> {
    try {
      const allMateriales = await this.materialesRepository.find({
        relations: [
          'categoria',
          'proveedor',
          'inventario',
          'materialBodegas',
          'materialBodegas.bodega',
          'materialBodegas.bodega.sede',
          'unidadMedida',
        ],
      });

      const rolTipo = (user?.usuarioRol?.rolTipo || user?.role || '').toLowerCase();
      const esSuperadminOGerencia = rolTipo === 'superadmin' || rolTipo === 'gerencia';

      let sedeFiltro: number | null = null;
      if (vistaCentroOperativoId != null && Number.isFinite(Number(vistaCentroOperativoId))) {
        const target = Number(vistaCentroOperativoId);
        const puede = await this.usuarioPuedeVerStockEnCentro(target, user);
        if (!puede) {
          throw new ForbiddenException('No tiene acceso al inventario de ese centro operativo.');
        }
        sedeFiltro = target;
      } else if (!esSuperadminOGerencia) {
        sedeFiltro = await this.resolveUsuarioSedeId(user);
      }

      if (sedeFiltro != null) {
        const sid = Number(sedeFiltro);
        const ids = await this.bodegasService.findBodegaIdsBySedeId(sid);
        const bodegaIdsEnSede = new Set(ids);
        const materialesConStockYSede = await Promise.all(
          allMateriales.map(async (material) => {
            const stockEnCentroOperativo = await this.calculateStockBySede(material, sid, bodegaIdsEnSede);
            const materialBodegasCentro = (material.materialBodegas || []).filter((mb: any) =>
              this.materialBodegaEnSede(mb, sid, bodegaIdsEnSede),
            );
            return {
              ...material,
              materialStock: stockEnCentroOperativo,
              materialBodegas: materialBodegasCentro,
            };
          }),
        );
        return materialesConStockYSede;
      }

      return allMateriales;
    } catch (error) {
      console.error('Error al obtener materiales:', error);
      throw error;
    }
  }

  /**
   * Incluye fila de materiales_bodegas si la bodega pertenece al centro, aunque `mb.bodega.sedeId`
   * no venga poblado en la relación (serialización / carga parcial).
   */
  private materialBodegaEnSede(
    mb: { bodegaId?: number; bodega?: { sedeId?: number; sede?: { sedeId?: number } } },
    sedeId: number,
    bodegaIdsEnSede: Set<number>,
  ): boolean {
    const sid = Number(sedeId);
    const fromRel = mb.bodega
      ? Number(mb.bodega.sedeId ?? mb.bodega.sede?.sedeId)
      : NaN;
    if (Number.isFinite(fromRel) && fromRel === sid) return true;
    const bid = mb.bodegaId != null ? Number(mb.bodegaId) : NaN;
    return Number.isFinite(bid) && bid > 0 && bodegaIdsEnSede.has(bid);
  }

  /**
   * Stock en un centro operativo: suma bodegas de la sede + cantidad en técnicos de esa sede.
   * Misma lógica para todos los materiales (incl. medidores): los movimientos actualizan bodegas/técnicos.
   */
  private async calculateStockBySede(
    material: Material,
    sedeId: number,
    bodegaIdsEnSede: Set<number>,
  ): Promise<number> {
    const sid = Number(sedeId);

    let stockTotal = 0;

    if (material.materialBodegas && material.materialBodegas.length > 0) {
      const stockBodegas = material.materialBodegas
        .filter((mb) => this.materialBodegaEnSede(mb, sid, bodegaIdsEnSede))
        .reduce((sum, mb) => sum + Number(mb.stock || 0), 0);
      stockTotal += stockBodegas;
    }

    try {
      const inventariosTecnicos = await this.inventarioTecnicoService.findByMaterial(
        material.materialId,
      );
      const stockTecnicos = inventariosTecnicos
        .filter((inv) => {
          const u = inv.usuario as { usuarioSede?: number; bodega?: { sedeId?: number } } | undefined;
          if (!u) return false;
          if (u.usuarioSede != null && Number(u.usuarioSede) === sid) return true;
          const bSede = u.bodega?.sedeId;
          return bSede != null && Number(bSede) === sid;
        })
        .reduce((sum, inv) => sum + Number(inv.cantidad || 0), 0);
      stockTotal += stockTecnicos;
    } catch (error) {
      console.error(
        `Error al calcular stock en técnicos para material ${material.materialId} y sede ${sedeId}:`,
        error,
      );
    }

    return stockTotal;
  }

  async findOne(id: number, user?: any): Promise<Material> {
    const material = await this.materialesRepository.findOne({
      where: { materialId: id },
      relations: [
        'categoria',
        'proveedor',
        'inventario',
        'materialBodegas',
        'materialBodegas.bodega',
        'materialBodegas.bodega.sede',
        'unidadMedida',
      ],
    });
    if (!material) {
      throw new NotFoundException(`Material con ID ${id} no encontrado`);
    }
    
    const rolTipo = (user?.usuarioRol?.rolTipo || user?.role || '').toLowerCase();
    const esSuperadminOGerencia = rolTipo === 'superadmin' || rolTipo === 'gerencia';
    const sedeId = await this.resolveUsuarioSedeId(user);

    if (sedeId != null && !esSuperadminOGerencia) {
      const sid = Number(sedeId);
      const ids = await this.bodegasService.findBodegaIdsBySedeId(sid);
      const bodegaIdsEnSede = new Set(ids);
      const materialBodegasCentro = (material.materialBodegas || []).filter((mb: any) =>
        this.materialBodegaEnSede(mb, sid, bodegaIdsEnSede),
      );
      const stockSede = await this.calculateStockBySede(material, sid, bodegaIdsEnSede);
      return {
        ...material,
        materialBodegas: materialBodegasCentro,
        materialStock: stockSede,
      } as Material;
    }
    return material;
  }

  async findByCodigo(codigo: string): Promise<Material | null> {
    return this.materialesRepository.findOne({
      where: { materialCodigo: codigo },
      relations: ['categoria', 'proveedor', 'inventario'],
    });
  }

  async findByNombre(nombre: string): Promise<Material | null> {
    return this.materialesRepository.findOne({
      where: { materialNombre: nombre },
      relations: ['categoria', 'proveedor', 'inventario'],
    });
  }

  async update(
    id: number,
    updateMaterialDto: UpdateMaterialDto,
    usuarioId?: number,
  ): Promise<Material> {
    const material = await this.findOne(id);
    const materialAnterior = { ...material };
    const { bodegas, materialStock, inventarioId, ...rest } = updateMaterialDto;

    // Validar que el código del material no esté duplicado (si se está cambiando)
    if (rest.materialCodigo && rest.materialCodigo !== material.materialCodigo) {
      const materialExistentePorCodigo = await this.findByCodigo(rest.materialCodigo);
      if (materialExistentePorCodigo && materialExistentePorCodigo.materialId !== id) {
        throw new ConflictException(
          `El código de material '${rest.materialCodigo}' ya está en uso. Los códigos deben ser únicos.`,
        );
      }
    }

    // Validar que el nombre del material no esté duplicado (si se está cambiando)
    if (rest.materialNombre && rest.materialNombre !== material.materialNombre) {
      const materialExistentePorNombre = await this.findByNombre(rest.materialNombre);
      if (materialExistentePorNombre && materialExistentePorNombre.materialId !== id) {
        throw new ConflictException(
          `El nombre de material '${rest.materialNombre}' ya está en uso. Los nombres deben ser únicos.`,
        );
      }
    }

    const updateData: any = {
      ...rest,
      materialStock: materialStock !== undefined ? Number(materialStock) : material.materialStock,
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
    const _updated = await this.materialesRepository.save(material);

    if (bodegas) {
      await this.materialesBodegasRepository.delete({ materialId: material.materialId });
      await this.applyBodegaDistribution(
        material.materialId,
        bodegas,
        materialStock,
        updateData.inventarioId || null,
        usuarioId,
      );
    } else if (materialStock !== undefined) {
      await this.syncMaterialStock(material.materialId);
    }

    // Registrar en auditoría
    if (usuarioId) {
      const materialActualizado = await this.findOne(material.materialId);
      await this.auditoriaService.registrarCambio({
        materialId: material.materialId,
        tipoCambio: TipoCambioInventario.ACTUALIZACION_MATERIAL,
        usuarioId,
        descripcion: `Actualización de material: ${material.materialNombre}`,
        datosAnteriores: {
          materialCodigo: materialAnterior.materialCodigo,
          materialNombre: materialAnterior.materialNombre,
          materialStock: materialAnterior.materialStock,
          materialPrecio: materialAnterior.materialPrecio,
          materialEstado: materialAnterior.materialEstado,
        },
        datosNuevos: {
          materialCodigo: materialActualizado.materialCodigo,
          materialNombre: materialActualizado.materialNombre,
          materialStock: materialActualizado.materialStock,
          materialPrecio: materialActualizado.materialPrecio,
          materialEstado: materialActualizado.materialEstado,
        },
        cantidadAnterior: materialAnterior.materialStock,
        cantidadNueva: materialActualizado.materialStock,
        diferencia:
          Number(materialActualizado.materialStock) - Number(materialAnterior.materialStock),
      });
    }

    return this.findOne(material.materialId);
  }

  async ajustarStock(
    id: number,
    cantidad: number,
    bodegaId?: number,
    usuarioId?: number,
  ): Promise<Material> {
    if (!bodegaId) {
      throw new Error('Debe especificar la bodega para ajustar el stock.');
    }

    const _materialAntes = await this.findOne(id);
    const stockBodegaAntes = await this.materialesBodegasRepository.findOne({
      where: { materialId: id, bodegaId },
    });
    const cantidadAnterior = stockBodegaAntes ? Number(stockBodegaAntes.stock) : 0;

    await this.adjustStockForBodega(id, bodegaId, cantidad);
    await this.syncMaterialStock(id);

    const materialDespues = await this.findOne(id);
    const stockBodegaDespues = await this.materialesBodegasRepository.findOne({
      where: { materialId: id, bodegaId },
    });
    const cantidadNueva = stockBodegaDespues ? Number(stockBodegaDespues.stock) : 0;

    // Registrar en auditoría
    if (usuarioId) {
      await this.auditoriaService.registrarCambio({
        materialId: id,
        tipoCambio: TipoCambioInventario.AJUSTE_STOCK,
        usuarioId,
        descripcion: `Ajuste de stock: ${cantidad > 0 ? '+' : ''}${cantidad} unidades`,
        cantidadAnterior,
        cantidadNueva,
        diferencia: cantidad,
        bodegaId,
        observaciones: `Stock ajustado manualmente en bodega`,
      });
    }

    return materialDespues;
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
      materialStock: nuevoStock,
    });

    // No llamar syncMaterialStock aquí: esa función fija materialStock = solo bodegas + técnicos
    // y borraría el stock "en sede" que acaba de sumarse cuando la entrada no va a una bodega concreta.

    return this.findOne(id);
  }

  async actualizarInventarioYPrecio(
    id: number,
    inventarioId?: number,
    precio?: number,
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
    precio?: number,
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
      (m) => m.materialEstado && Number(m.materialStock || 0) > 0,
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
    usuarioId?: number,
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

        const cantidadAnterior = existingRecord ? Number(existingRecord.stock) : 0;
        const cantidadNueva = Number(entry.stock ?? 0);

        if (existingRecord) {
          // Actualizar el registro existente
          existingRecord.stock = cantidadNueva;
          existingRecord.precioPromedio =
            entry.precioPromedio !== undefined ? Number(entry.precioPromedio) : null;
          await this.materialesBodegasRepository.save(existingRecord);
        } else {
          // Crear un nuevo registro
          const record = this.materialesBodegasRepository.create({
            materialId,
            bodegaId: entry.bodegaId,
            stock: cantidadNueva,
            precioPromedio:
              entry.precioPromedio !== undefined ? Number(entry.precioPromedio) : null,
          });
          await this.materialesBodegasRepository.save(record);
        }

        // Registrar en auditoría si hay cambio y usuarioId
        if (usuarioId && cantidadAnterior !== cantidadNueva) {
          await this.auditoriaService.registrarCambio({
            materialId,
            tipoCambio: TipoCambioInventario.DISTRIBUCION_BODEGA,
            usuarioId,
            descripcion: `Distribución de stock en bodega: ${cantidadNueva} unidades`,
            cantidadAnterior,
            cantidadNueva,
            diferencia: cantidadNueva - cantidadAnterior,
            bodegaId: entry.bodegaId,
            observaciones: `Stock distribuido en bodega`,
          });
        }
      } catch (error) {
        console.error(
          `Error al guardar distribución de bodega ${entry.bodegaId} para material ${materialId}:`,
          error,
        );
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
  /**
   * Stock total del material = suma en todas las bodegas + inventario de todos los técnicos.
   * Debe coincidir con entradas, salidas, traslados, asignaciones y devoluciones (ajustan bodega/técnico).
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
