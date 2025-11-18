import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovimientoInventario, TipoMovimiento } from './movimiento-inventario.entity';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { MaterialesService } from '../materiales/materiales.service';
import { InventariosService } from '../inventarios/inventarios.service';
import { ProveedoresService } from '../proveedores/proveedores.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class MovimientosService {
  constructor(
    @InjectRepository(MovimientoInventario)
    private movimientosRepository: Repository<MovimientoInventario>,
    @Inject(forwardRef(() => MaterialesService))
    private materialesService: MaterialesService,
    @Inject(forwardRef(() => InventariosService))
    private inventariosService: InventariosService,
    @Inject(forwardRef(() => ProveedoresService))
    private proveedoresService: ProveedoresService,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
  ) {}

  async create(createMovimientoDto: CreateMovimientoDto): Promise<MovimientoInventario[]> {
    // Generar código único para agrupar los movimientos
    const movimientoCodigo = createMovimientoDto.movimientoCodigo ||
      `${createMovimientoDto.movimientoTipo.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const movimientosCreados: MovimientoInventario[] = [];
    const inventarioCache = new Map<number, { inventarioId: number; bodegaId: number | null }>();
    const bodegaCache = new Map<number, { inventarioId: number | null; bodegaId: number | null }>();
    let defaultInventarioContext: { inventarioId: number | null; bodegaId: number | null } | undefined;

    const cargarInventario = async (inventarioId?: number | null): Promise<{ inventarioId: number; bodegaId: number | null } | null> => {
      if (!inventarioId) return null;
      if (inventarioCache.has(inventarioId)) {
        return inventarioCache.get(inventarioId)!;
      }
      try {
        const inventario = await this.inventariosService.findOne(inventarioId);
        const context = {
          inventarioId: inventario.inventarioId,
          bodegaId: inventario.bodegaId ?? inventario.bodega?.bodegaId ?? null,
        };
        inventarioCache.set(inventarioId, context);
        if (context.bodegaId && !bodegaCache.has(context.bodegaId)) {
          bodegaCache.set(context.bodegaId, context);
        }
        return context;
      } catch (error) {
        return null;
      }
    };

    const cargarPorBodega = async (bodegaId?: number | null): Promise<{ inventarioId: number | null; bodegaId: number | null } | null> => {
      if (!bodegaId) return null;
      if (bodegaCache.has(bodegaId)) {
        return bodegaCache.get(bodegaId)!;
      }
      try {
        const inventario = await this.inventariosService.findByBodega(bodegaId);
        if (inventario) {
          const context = {
            inventarioId: inventario.inventarioId,
            bodegaId: inventario.bodegaId ?? inventario.bodega?.bodegaId ?? bodegaId,
          };
          inventarioCache.set(context.inventarioId, context);
          bodegaCache.set(context.bodegaId!, context);
          return context;
        }
      } catch (error) {
        // ignorar
      }
      const fallback = { inventarioId: null, bodegaId };
      bodegaCache.set(bodegaId, fallback);
      return fallback;
    };

    const obtenerContextoInventario = async (material: any): Promise<{ inventarioId: number | null; bodegaId: number | null }> => {
      // Preferencia explícita del DTO
      if (createMovimientoDto.inventarioId) {
        const context = await cargarInventario(createMovimientoDto.inventarioId);
        if (!context) {
          throw new BadRequestException('El inventario seleccionado no existe.');
        }
        return context;
      }

      // Inventario directo del material
      const materialInventario = await cargarInventario(material?.inventarioId || material?.inventario?.inventarioId);
      if (materialInventario) {
        return materialInventario;
      }

      // Distribución por bodegas del material
      if (Array.isArray(material?.materialBodegas) && material.materialBodegas.length > 0) {
        for (const entry of material.materialBodegas) {
          const context = await cargarPorBodega(entry?.bodegaId);
          if (context) {
            return context;
          }
        }
      }

      // Inventario asociado al material (con bodega)
      const inventarioPorBodega = await cargarPorBodega(material?.inventario?.bodegaId);
      if (inventarioPorBodega) {
        return inventarioPorBodega;
      }

      if (!defaultInventarioContext) {
        const inventarios = await this.inventariosService.findAll();
        if (inventarios.length > 0) {
          const first = inventarios[0];
          defaultInventarioContext = {
            inventarioId: first.inventarioId,
            bodegaId: first.bodegaId ?? first.bodega?.bodegaId ?? null,
          };
        } else {
          defaultInventarioContext = { inventarioId: null, bodegaId: null };
        }
      }

      return defaultInventarioContext;
    };

    // Si se proporciona oficinaId, actualizar la oficina del usuario solo si NO es superadmin
    // (los superadmins pueden trabajar con múltiples oficinas)
    console.log('createMovimientoDto recibido:', {
      oficinaId: createMovimientoDto.oficinaId,
      usuarioId: createMovimientoDto.usuarioId,
      movimientoTipo: createMovimientoDto.movimientoTipo,
      materialesCount: createMovimientoDto.materiales?.length
    });
    if (createMovimientoDto.oficinaId && createMovimientoDto.usuarioId) {
      try {
        const usuario = await this.usersService.findOne(createMovimientoDto.usuarioId);
        const esSuperAdmin = usuario.usuarioRol?.rolTipo === 'superadmin';
        
        // Solo actualizar la oficina del usuario si NO es superadmin y no tiene oficina asignada
        if (!esSuperAdmin && !usuario.usuarioOficina) {
          await this.usersService.update(createMovimientoDto.usuarioId, {
            usuarioOficina: createMovimientoDto.oficinaId,
          });
          console.log(`Oficina actualizada para usuario ${createMovimientoDto.usuarioId}: ${createMovimientoDto.oficinaId}`);
        } else if (esSuperAdmin) {
          console.log(`Usuario ${createMovimientoDto.usuarioId} es superadmin, no se actualiza su oficina`);
        }
      } catch (err) {
        console.error(`Error al actualizar la oficina del usuario ${createMovimientoDto.usuarioId}:`, err);
      }
    }

    // Procesar cada material del array
    for (const materialDto of createMovimientoDto.materiales) {
      // Verificar que el material existe
      let material = await this.materialesService.findOne(materialDto.materialId);
      let materialIdFinal = materialDto.materialId;
      let precioUnitario = materialDto.movimientoPrecioUnitario;
      const inventarioContexto = await obtenerContextoInventario(material);
      // Permitir movimientos sin inventarioId (se asignará después desde la lista)
      const inventarioDestino = inventarioContexto?.inventarioId || null;
      const bodegaDestino = inventarioContexto?.bodegaId || null;

      // Si es una ENTRADA con proveedor diferente, crear o encontrar variante
      if (createMovimientoDto.movimientoTipo === TipoMovimiento.ENTRADA && createMovimientoDto.proveedorId) {
        // Verificar si el proveedor es diferente al del material original
        if (material.proveedorId !== createMovimientoDto.proveedorId) {
          // Buscar si ya existe una variante con este proveedor
          const varianteExistente = await this.materialesService.findByProveedorAndCodigo(
            createMovimientoDto.proveedorId,
            material.materialCodigo
          );

          if (varianteExistente) {
            // Usar la variante existente
            material = varianteExistente;
            materialIdFinal = varianteExistente.materialId;
          } else {
            // Crear nueva variante del material
            const materialPadreId = material.materialPadreId || material.materialId;
            const nuevaVariante = await this.materialesService.createVariante(
              material,
              createMovimientoDto.proveedorId,
              materialPadreId,
              inventarioDestino,
              precioUnitario
            );
            material = nuevaVariante;
            materialIdFinal = nuevaVariante.materialId;
          }
        }

        // Si tiene inventarioId, actualizar el material
        if (inventarioDestino) {
          await this.materialesService.actualizarInventarioYPrecio(
            materialIdFinal,
            inventarioDestino,
            precioUnitario,
          );
        }
      }

      // Si es SALIDA, usar lógica FIFO para obtener el material más antiguo
      if (createMovimientoDto.movimientoTipo === TipoMovimiento.SALIDA) {
        const materialFIFO = await this.materialesService.findMaterialFIFO(
          material.materialCodigo,
          materialDto.movimientoCantidad
        );
        if (materialFIFO) {
          materialIdFinal = materialFIFO.materialId;
        }
      }

      // Crear el movimiento con el materialId correcto
      // Nota: bodegaId no se guarda porque la columna no existe en la BD
      const movimientoData: any = {
        movimientoTipo: createMovimientoDto.movimientoTipo,
        materialId: materialIdFinal,
        movimientoCantidad: materialDto.movimientoCantidad,
        movimientoPrecioUnitario: precioUnitario,
        movimientoObservaciones: createMovimientoDto.movimientoObservaciones,
        instalacionId: createMovimientoDto.instalacionId,
        usuarioId: createMovimientoDto.usuarioId,
        proveedorId: createMovimientoDto.proveedorId,
        inventarioId: inventarioDestino,
        movimientoCodigo: movimientoCodigo,
        oficinaId: createMovimientoDto.oficinaId || null, // Guardar oficina directamente en el movimiento
      };
      console.log('=== CREANDO MOVIMIENTO ===');
      console.log('createMovimientoDto.oficinaId recibido:', createMovimientoDto.oficinaId);
      console.log('movimientoData antes de crear:', JSON.stringify(movimientoData, null, 2));
      console.log('oficinaId en movimientoData:', movimientoData.oficinaId);
      console.log('Tipo de oficinaId:', typeof movimientoData.oficinaId);
      let movimientoGuardado: any;
      try {
        const movimiento = this.movimientosRepository.create(movimientoData);
        movimientoGuardado = await this.movimientosRepository.save(movimiento);
        console.log('movimientoGuardado después de guardar:', {
          movimientoId: movimientoGuardado.movimientoId,
          oficinaId: movimientoGuardado.oficinaId,
          movimientoCodigo: movimientoGuardado.movimientoCodigo,
        });
        
        // Verificar directamente desde la BD si se guardó
        if (movimientoGuardado.movimientoId) {
          const verificarOficina = await this.movimientosRepository.query(
            'SELECT oficinaId FROM movimientos_inventario WHERE movimientoId = ?',
            [movimientoGuardado.movimientoId]
          );
          console.log('Verificación directa desde BD - oficinaId:', verificarOficina?.[0]?.oficinaId);
        }
      } catch (saveError: any) {
        console.error('Error al guardar movimiento:', saveError);
        console.error('Error message:', saveError.message);
        console.error('Error stack:', saveError.stack);
        throw saveError;
      }
      
      // Obtener el movimiento guardado para agregarlo a la lista
      // Usar solo los datos necesarios para evitar problemas de serialización
      if (movimientoGuardado) {
        movimientosCreados.push({
          movimientoId: movimientoGuardado.movimientoId,
          materialId: movimientoGuardado.materialId,
          movimientoTipo: movimientoGuardado.movimientoTipo,
          movimientoCantidad: movimientoGuardado.movimientoCantidad,
          movimientoPrecioUnitario: movimientoGuardado.movimientoPrecioUnitario,
          movimientoObservaciones: movimientoGuardado.movimientoObservaciones,
          instalacionId: movimientoGuardado.instalacionId,
          usuarioId: movimientoGuardado.usuarioId,
          proveedorId: movimientoGuardado.proveedorId,
          inventarioId: movimientoGuardado.inventarioId,
          movimientoCodigo: movimientoGuardado.movimientoCodigo,
          oficinaId: movimientoGuardado.oficinaId,
          movimientoEstado: movimientoGuardado.movimientoEstado,
          fechaCreacion: movimientoGuardado.fechaCreacion,
          fechaActualizacion: movimientoGuardado.fechaActualizacion,
        } as any);
      }

      // Ajustar stock según el tipo de movimiento (solo si hay bodega asignada)
      if (bodegaDestino) {
        await this.ajustarStockMovimiento(
          materialIdFinal,
          createMovimientoDto.movimientoTipo,
          materialDto.movimientoCantidad,
          bodegaDestino,
        );
      }
    }

    // Retornar solo un movimiento si hay uno, o el array completo
    try {
      if (movimientosCreados.length === 1) {
        return movimientosCreados[0];
      }
      return movimientosCreados;
    } catch (error) {
      console.error('Error al retornar movimientos creados:', error);
      throw error;
    }
  }

  private async ajustarStockMovimiento(
    materialId: number,
    tipo: TipoMovimiento,
    cantidad: number,
    bodegaId: number,
  ): Promise<void> {
    let ajusteCantidad = 0;

    switch (tipo) {
      case TipoMovimiento.ENTRADA:
        ajusteCantidad = cantidad; // +cantidad
        break;
      case TipoMovimiento.SALIDA:
        ajusteCantidad = -cantidad; // -cantidad
        break;
      case TipoMovimiento.DEVOLUCION:
        ajusteCantidad = cantidad; // +cantidad
        break;
    }

    await this.materialesService.ajustarStock(materialId, ajusteCantidad, bodegaId);
  }

  async findAll(): Promise<any[]> {
    try {
      // Primero intentar con query raw para evitar problemas con TypeORM y relaciones
      const rawMovimientos = await this.movimientosRepository.query(
        'SELECT * FROM movimientos_inventario ORDER BY fechaCreacion DESC'
      );

      // Si hay movimientos, cargar relaciones manualmente
      if (rawMovimientos.length > 0) {
        const inventarioIds = Array.from(new Set(rawMovimientos
          .map((movimiento: any) => movimiento.inventarioId)
          .filter((id: any) => id !== null && id !== undefined)
          .map((id: any) => Number(id))
          .filter((id: number) => !isNaN(id))));

        const inventarioMap = new Map<number, any>();
        await Promise.all(
          inventarioIds.map(async (inventarioId: number) => {
            try {
              const inventario = await this.inventariosService.findOne(inventarioId);
              inventarioMap.set(inventarioId, inventario);
            } catch (error) {
              console.warn(`No se pudo cargar inventario ${inventarioId}:`, error);
            }
          })
        );

        const bodegaMap = new Map<number, any>();

        const movimientosConRelaciones = await Promise.all(
          rawMovimientos.map(async (movimiento: any) => {
            const movimientoConRelaciones: any = { ...movimiento };

            // Cargar material si existe
            if (movimiento.materialId) {
              try {
                const material = await this.materialesService.findOne(movimiento.materialId);
                movimientoConRelaciones.material = {
                  materialId: material.materialId,
                  materialCodigo: material.materialCodigo,
                  materialNombre: material.materialNombre,
                  materialStock: material.materialStock,
                  materialPrecio: material.materialPrecio,
                  materialFoto: material.materialFoto,
                  materialEstado: material.materialEstado,
                };
              } catch (err) {
                console.warn(`No se pudo cargar material ${movimiento.materialId} para movimiento ${movimiento.movimientoId}:`, err);
              }
            }

            if (movimiento.inventarioId) {
              const inventario = inventarioMap.get(Number(movimiento.inventarioId));
              if (inventario) {
                movimientoConRelaciones.inventario = inventario;
                movimientoConRelaciones.bodega = inventario.bodega ?? null;
                movimientoConRelaciones.bodegaId = inventario.bodegaId ?? inventario.bodega?.bodegaId ?? null;
              }
            }

            // Cargar proveedor si existe
            if (movimiento.proveedorId) {
              try {
                const proveedor = await this.proveedoresService.findOne(movimiento.proveedorId);
                movimientoConRelaciones.proveedor = {
                  proveedorId: proveedor.proveedorId,
                  proveedorNombre: proveedor.proveedorNombre,
                  proveedorNit: proveedor.proveedorNit,
                  proveedorTelefono: proveedor.proveedorTelefono,
                  proveedorEmail: proveedor.proveedorEmail,
                  proveedorDireccion: proveedor.proveedorDireccion,
                  proveedorContacto: proveedor.proveedorContacto,
                  proveedorEstado: proveedor.proveedorEstado,
                };
              } catch (err) {
                console.warn(`No se pudo cargar proveedor ${movimiento.proveedorId}:`, err);
              }
            }

            // Cargar usuario si existe
            if (movimiento.usuarioId) {
              try {
                const usuario = await this.usersService.findOne(movimiento.usuarioId);
                movimientoConRelaciones.usuario = {
                  usuarioId: usuario.usuarioId,
                  usuarioNombre: usuario.usuarioNombre,
                  usuarioApellido: usuario.usuarioApellido,
                  usuarioCorreo: usuario.usuarioCorreo,
                  usuarioTelefono: usuario.usuarioTelefono,
                  usuarioDocumento: usuario.usuarioDocumento,
                  usuarioEstado: usuario.usuarioEstado,
                  usuarioOficina: usuario.usuarioOficina,
                  oficina: usuario.oficina ? {
                    oficinaId: usuario.oficina.oficinaId,
                    oficinaNombre: usuario.oficina.oficinaNombre,
                  } : null,
                };
              } catch (err) {
                console.warn(`No se pudo cargar usuario ${movimiento.usuarioId}:`, err);
              }
            }

            // Cargar oficina desde el movimiento si existe (prioridad sobre la del usuario)
            // El oficinaId viene del query raw, así que lo copiamos directamente
            if (movimiento.oficinaId) {
              movimientoConRelaciones.oficinaId = movimiento.oficinaId;
              try {
                // Usar query directa para obtener la oficina
                const oficinaRaw = await this.movimientosRepository.query(
                  'SELECT oficinaId, oficinaNombre FROM oficinas WHERE oficinaId = ?',
                  [movimiento.oficinaId]
                );
                if (oficinaRaw && oficinaRaw.length > 0) {
                  movimientoConRelaciones.oficina = {
                    oficinaId: oficinaRaw[0].oficinaId,
                    oficinaNombre: oficinaRaw[0].oficinaNombre,
                  };
                  console.log(`Oficina cargada para movimiento ${movimiento.movimientoId}:`, oficinaRaw[0].oficinaNombre);
                } else {
                  console.warn(`No se encontró oficina con ID ${movimiento.oficinaId} en la base de datos`);
                }
              } catch (err) {
                console.error(`Error al cargar oficina ${movimiento.oficinaId} para movimiento ${movimiento.movimientoId}:`, err);
              }
            } else {
              console.log(`Movimiento ${movimiento.movimientoId} no tiene oficinaId asignado`);
            }

            return movimientoConRelaciones;
          })
        );

        return movimientosConRelaciones;
      }

      return rawMovimientos;
    } catch (error) {
      console.error('Error en findAll de movimientos:', error);
      console.error('Mensaje:', error instanceof Error ? error.message : String(error));
      console.error('Nombre del error:', error instanceof Error ? error.name : 'Unknown');
      if (error instanceof Error && error.stack) {
        console.error('Stack trace completo:');
        console.error(error.stack);
      }
      throw error;
    }
  }

  async findOne(id: number): Promise<any> {
    try {
      // Obtener el movimiento sin relaciones problemáticas (bodega se obtiene a través de inventario)
      const movimiento = await this.movimientosRepository.findOne({
        where: { movimientoId: id },
        relations: ['usuario', 'instalacion', 'proveedor', 'inventario', 'inventario.bodega'],
      });
      
      if (!movimiento) {
        throw new NotFoundException(`Movimiento con ID ${id} no encontrado`);
      }

      // Cargar material manualmente
      const movimientoConRelaciones: any = { ...movimiento };
      if (movimiento.materialId) {
        try {
          const material = await this.materialesService.findOne(movimiento.materialId);
          movimientoConRelaciones.material = {
            materialId: material.materialId,
            materialCodigo: material.materialCodigo,
            materialNombre: material.materialNombre,
            materialStock: material.materialStock,
            materialPrecio: material.materialPrecio,
            materialFoto: material.materialFoto,
            materialEstado: material.materialEstado,
          };
        } catch (err) {
          console.warn(`No se pudo cargar material ${movimiento.materialId} para movimiento ${movimiento.movimientoId}:`, err);
        }
      }

      // Asegurar que inventario tenga bodega cargada
      if (movimiento.inventario && !movimiento.inventario.bodega && movimiento.inventario.bodegaId) {
        try {
          const inventarioCompleto = await this.inventariosService.findOne(movimiento.inventario.inventarioId);
          movimientoConRelaciones.inventario = inventarioCompleto;
        } catch (err) {
          console.warn(`No se pudo cargar inventario completo ${movimiento.inventario.inventarioId}:`, err);
        }
      }

      // Asignar bodega desde inventario
      if (movimientoConRelaciones.inventario) {
        movimientoConRelaciones.bodega = movimientoConRelaciones.inventario.bodega ?? null;
        movimientoConRelaciones.bodegaId = movimientoConRelaciones.inventario.bodegaId ?? movimientoConRelaciones.inventario.bodega?.bodegaId ?? null;
      }

      // Cargar proveedor si existe y no está cargado
      if (movimiento.proveedorId && !movimientoConRelaciones.proveedor) {
        try {
          const proveedor = await this.proveedoresService.findOne(movimiento.proveedorId);
          movimientoConRelaciones.proveedor = {
            proveedorId: proveedor.proveedorId,
            proveedorNombre: proveedor.proveedorNombre,
            proveedorNit: proveedor.proveedorNit,
            proveedorTelefono: proveedor.proveedorTelefono,
            proveedorEmail: proveedor.proveedorEmail,
            proveedorDireccion: proveedor.proveedorDireccion,
            proveedorContacto: proveedor.proveedorContacto,
            proveedorEstado: proveedor.proveedorEstado,
          };
        } catch (err) {
          console.warn(`No se pudo cargar proveedor ${movimiento.proveedorId}:`, err);
        }
      }

      // Cargar usuario si existe y no está cargado
      if (movimiento.usuarioId && !movimientoConRelaciones.usuario) {
        try {
          const usuario = await this.usersService.findOne(movimiento.usuarioId);
          movimientoConRelaciones.usuario = {
            usuarioId: usuario.usuarioId,
            usuarioNombre: usuario.usuarioNombre,
            usuarioApellido: usuario.usuarioApellido,
            usuarioCorreo: usuario.usuarioCorreo,
            usuarioTelefono: usuario.usuarioTelefono,
            usuarioDocumento: usuario.usuarioDocumento,
            usuarioEstado: usuario.usuarioEstado,
            usuarioOficina: usuario.usuarioOficina,
            oficina: usuario.oficina ? {
              oficinaId: usuario.oficina.oficinaId,
              oficinaNombre: usuario.oficina.oficinaNombre,
            } : null,
          };
        } catch (err) {
          console.warn(`No se pudo cargar usuario ${movimiento.usuarioId}:`, err);
        }
      }

      // Cargar oficina desde el movimiento si existe (prioridad sobre la del usuario)
      if (movimiento.oficinaId) {
        try {
          const oficinaRaw = await this.movimientosRepository.query(
            'SELECT oficinaId, oficinaNombre FROM oficinas WHERE oficinaId = ?',
            [movimiento.oficinaId]
          );
          if (oficinaRaw && oficinaRaw.length > 0) {
            movimientoConRelaciones.oficina = {
              oficinaId: oficinaRaw[0].oficinaId,
              oficinaNombre: oficinaRaw[0].oficinaNombre,
            };
          }
        } catch (err) {
          console.warn(`No se pudo cargar oficina ${movimiento.oficinaId}:`, err);
        }
      }

      return movimientoConRelaciones;
    } catch (error) {
      console.error('Error en findOne de movimientos:', error);
      throw error;
    }
  }

  async findByCodigo(codigo: string): Promise<any[]> {
    try {
      const movimientos = await this.movimientosRepository.find({
        where: { movimientoCodigo: codigo },
        relations: ['usuario', 'instalacion', 'proveedor', 'inventario', 'inventario.bodega'],
      });

      // Cargar materiales manualmente para cada movimiento
      const movimientosConRelaciones = await Promise.all(
        movimientos.map(async (movimiento) => {
          const movimientoConRelaciones: any = { ...movimiento };
          
          if (movimiento.materialId) {
            try {
              const material = await this.materialesService.findOne(movimiento.materialId);
              movimientoConRelaciones.material = {
                materialId: material.materialId,
                materialCodigo: material.materialCodigo,
                materialNombre: material.materialNombre,
                materialStock: material.materialStock,
                materialPrecio: material.materialPrecio,
                materialFoto: material.materialFoto,
                materialEstado: material.materialEstado,
              };
            } catch (err) {
              console.warn(`No se pudo cargar material ${movimiento.materialId}:`, err);
            }
          }

          // Asegurar que inventario tenga bodega cargada
          if (movimiento.inventario && !movimiento.inventario.bodega && movimiento.inventario.bodegaId) {
            try {
              const inventarioCompleto = await this.inventariosService.findOne(movimiento.inventario.inventarioId);
              movimientoConRelaciones.inventario = inventarioCompleto;
            } catch (err) {
              console.warn(`No se pudo cargar inventario completo ${movimiento.inventario.inventarioId}:`, err);
            }
          }

          // Asignar bodega desde inventario
          if (movimientoConRelaciones.inventario) {
            movimientoConRelaciones.bodega = movimientoConRelaciones.inventario.bodega ?? null;
            movimientoConRelaciones.bodegaId = movimientoConRelaciones.inventario.bodegaId ?? movimientoConRelaciones.inventario.bodega?.bodegaId ?? null;
          }

          // Cargar proveedor si existe y no está cargado
          if (movimiento.proveedorId && !movimientoConRelaciones.proveedor) {
            try {
              const proveedor = await this.proveedoresService.findOne(movimiento.proveedorId);
              movimientoConRelaciones.proveedor = {
                proveedorId: proveedor.proveedorId,
                proveedorNombre: proveedor.proveedorNombre,
                proveedorNit: proveedor.proveedorNit,
                proveedorTelefono: proveedor.proveedorTelefono,
                proveedorEmail: proveedor.proveedorEmail,
                proveedorDireccion: proveedor.proveedorDireccion,
                proveedorContacto: proveedor.proveedorContacto,
                proveedorEstado: proveedor.proveedorEstado,
              };
            } catch (err) {
              console.warn(`No se pudo cargar proveedor ${movimiento.proveedorId}:`, err);
            }
          }

          // Cargar usuario si existe y no está cargado
          if (movimiento.usuarioId && !movimientoConRelaciones.usuario) {
            try {
              const usuario = await this.usersService.findOne(movimiento.usuarioId);
              movimientoConRelaciones.usuario = {
                usuarioId: usuario.usuarioId,
                usuarioNombre: usuario.usuarioNombre,
                usuarioApellido: usuario.usuarioApellido,
                usuarioCorreo: usuario.usuarioCorreo,
                usuarioTelefono: usuario.usuarioTelefono,
                usuarioDocumento: usuario.usuarioDocumento,
                usuarioEstado: usuario.usuarioEstado,
                usuarioOficina: usuario.usuarioOficina,
                oficina: usuario.oficina ? {
                  oficinaId: usuario.oficina.oficinaId,
                  oficinaNombre: usuario.oficina.oficinaNombre,
                } : null,
              };
            } catch (err) {
              console.warn(`No se pudo cargar usuario ${movimiento.usuarioId}:`, err);
            }
          }

          // Cargar oficina desde el movimiento si existe (prioridad sobre la del usuario)
          if (movimiento.oficinaId) {
            try {
              const oficinaRaw = await this.movimientosRepository.query(
                'SELECT oficinaId, oficinaNombre FROM oficinas WHERE oficinaId = ?',
                [movimiento.oficinaId]
              );
              if (oficinaRaw && oficinaRaw.length > 0) {
                movimientoConRelaciones.oficina = {
                  oficinaId: oficinaRaw[0].oficinaId,
                  oficinaNombre: oficinaRaw[0].oficinaNombre,
                };
              }
            } catch (err) {
              console.warn(`No se pudo cargar oficina ${movimiento.oficinaId}:`, err);
            }
          }

          return movimientoConRelaciones;
        })
      );

      return movimientosConRelaciones;
    } catch (error) {
      console.error('Error en findByCodigo de movimientos:', error);
      throw error;
    }
  }

  async findByInstalacion(instalacionId: number): Promise<any[]> {
    try {
      const movimientos = await this.movimientosRepository.find({
        where: { instalacionId },
        relations: ['usuario', 'instalacion', 'proveedor', 'inventario', 'inventario.bodega'],
      });

      // Cargar materiales manualmente
      const movimientosConRelaciones = await Promise.all(
        movimientos.map(async (movimiento) => {
          const movimientoConRelaciones: any = { ...movimiento };
          
          if (movimiento.materialId) {
            try {
              const material = await this.materialesService.findOne(movimiento.materialId);
              movimientoConRelaciones.material = {
                materialId: material.materialId,
                materialCodigo: material.materialCodigo,
                materialNombre: material.materialNombre,
                materialStock: material.materialStock,
                materialPrecio: material.materialPrecio,
                materialFoto: material.materialFoto,
                materialEstado: material.materialEstado,
              };
            } catch (err) {
              console.warn(`No se pudo cargar material ${movimiento.materialId}:`, err);
            }
          }

          // Asegurar que inventario tenga bodega cargada
          if (movimiento.inventario && !movimiento.inventario.bodega && movimiento.inventario.bodegaId) {
            try {
              const inventarioCompleto = await this.inventariosService.findOne(movimiento.inventario.inventarioId);
              movimientoConRelaciones.inventario = inventarioCompleto;
            } catch (err) {
              console.warn(`No se pudo cargar inventario completo ${movimiento.inventario.inventarioId}:`, err);
            }
          }

          // Asignar bodega desde inventario
          if (movimientoConRelaciones.inventario) {
            movimientoConRelaciones.bodega = movimientoConRelaciones.inventario.bodega ?? null;
            movimientoConRelaciones.bodegaId = movimientoConRelaciones.inventario.bodegaId ?? movimientoConRelaciones.inventario.bodega?.bodegaId ?? null;
          }

          // Cargar proveedor si existe y no está cargado
          if (movimiento.proveedorId && !movimientoConRelaciones.proveedor) {
            try {
              const proveedor = await this.proveedoresService.findOne(movimiento.proveedorId);
              movimientoConRelaciones.proveedor = {
                proveedorId: proveedor.proveedorId,
                proveedorNombre: proveedor.proveedorNombre,
                proveedorNit: proveedor.proveedorNit,
                proveedorTelefono: proveedor.proveedorTelefono,
                proveedorEmail: proveedor.proveedorEmail,
                proveedorDireccion: proveedor.proveedorDireccion,
                proveedorContacto: proveedor.proveedorContacto,
                proveedorEstado: proveedor.proveedorEstado,
              };
            } catch (err) {
              console.warn(`No se pudo cargar proveedor ${movimiento.proveedorId}:`, err);
            }
          }

          // Cargar usuario si existe y no está cargado
          if (movimiento.usuarioId && !movimientoConRelaciones.usuario) {
            try {
              const usuario = await this.usersService.findOne(movimiento.usuarioId);
              movimientoConRelaciones.usuario = {
                usuarioId: usuario.usuarioId,
                usuarioNombre: usuario.usuarioNombre,
                usuarioApellido: usuario.usuarioApellido,
                usuarioCorreo: usuario.usuarioCorreo,
                usuarioTelefono: usuario.usuarioTelefono,
                usuarioDocumento: usuario.usuarioDocumento,
                usuarioEstado: usuario.usuarioEstado,
                usuarioOficina: usuario.usuarioOficina,
                oficina: usuario.oficina ? {
                  oficinaId: usuario.oficina.oficinaId,
                  oficinaNombre: usuario.oficina.oficinaNombre,
                } : null,
              };
            } catch (err) {
              console.warn(`No se pudo cargar usuario ${movimiento.usuarioId}:`, err);
            }
          }

          // Cargar oficina desde el movimiento si existe (prioridad sobre la del usuario)
          if (movimiento.oficinaId) {
            try {
              const oficinaRaw = await this.movimientosRepository.query(
                'SELECT oficinaId, oficinaNombre FROM oficinas WHERE oficinaId = ?',
                [movimiento.oficinaId]
              );
              if (oficinaRaw && oficinaRaw.length > 0) {
                movimientoConRelaciones.oficina = {
                  oficinaId: oficinaRaw[0].oficinaId,
                  oficinaNombre: oficinaRaw[0].oficinaNombre,
                };
              }
            } catch (err) {
              console.warn(`No se pudo cargar oficina ${movimiento.oficinaId}:`, err);
            }
          }

          return movimientoConRelaciones;
        })
      );

      return movimientosConRelaciones;
    } catch (error) {
      console.error('Error en findByInstalacion:', error);
      throw error;
    }
  }

  async update(id: number, updateMovimientoDto: Partial<CreateMovimientoDto>): Promise<MovimientoInventario> {
    const movimiento = await this.movimientosRepository.findOne({
      where: { movimientoId: id },
    });

    if (!movimiento) {
      throw new NotFoundException(`Movimiento con ID ${id} no encontrado`);
    }

    // Actualizar campos permitidos
    if (updateMovimientoDto.movimientoObservaciones !== undefined) {
      movimiento.movimientoObservaciones = updateMovimientoDto.movimientoObservaciones || null;
    }
    if (updateMovimientoDto.instalacionId !== undefined) {
      movimiento.instalacionId = updateMovimientoDto.instalacionId || null;
    }
    if (updateMovimientoDto.proveedorId !== undefined) {
      movimiento.proveedorId = updateMovimientoDto.proveedorId || null;
    }
    if (updateMovimientoDto.inventarioId !== undefined) {
      movimiento.inventarioId = updateMovimientoDto.inventarioId || null;
    }
    if (updateMovimientoDto.oficinaId !== undefined) {
      movimiento.oficinaId = updateMovimientoDto.oficinaId || null;
    }

    // Si hay materiales, actualizar el primer material (para movimientos únicos)
    if (updateMovimientoDto.materiales && updateMovimientoDto.materiales.length > 0) {
      const primerMaterial = updateMovimientoDto.materiales[0];
      movimiento.materialId = primerMaterial.materialId;
      movimiento.movimientoCantidad = primerMaterial.movimientoCantidad;
      movimiento.movimientoPrecioUnitario = primerMaterial.movimientoPrecioUnitario || null;
    }

    return await this.movimientosRepository.save(movimiento);
  }

  async remove(id: number): Promise<void> {
    const movimiento = await this.findOne(id);
    await this.movimientosRepository.remove(movimiento);
  }
}

