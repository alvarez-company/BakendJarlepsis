import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MovimientoInventario,
  TipoMovimiento,
  EstadoMovimiento,
} from './movimiento-inventario.entity';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { MaterialesService } from '../materiales/materiales.service';
import { InventariosService } from '../inventarios/inventarios.service';
import { ProveedoresService } from '../proveedores/proveedores.service';
import { UsersService } from '../users/users.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { TipoEntidad } from '../auditoria/auditoria.entity';
import { AuditoriaInventarioService } from '../auditoria-inventario/auditoria-inventario.service';
import { TipoCambioInventario } from '../auditoria-inventario/auditoria-inventario.entity';
import { InventarioTecnicoService } from '../inventario-tecnico/inventario-tecnico.service';
import { NumerosMedidorService } from '../numeros-medidor/numeros-medidor.service';
import { EstadoNumeroMedidor } from '../numeros-medidor/numero-medidor.entity';
import { BodegasService } from '../bodegas/bodegas.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

// Función auxiliar para obtener etiqueta del tipo de movimiento
function getTipoLabel(tipo: TipoMovimiento): string {
  if (tipo === TipoMovimiento.ENTRADA) return 'Entrada';
  if (tipo === TipoMovimiento.SALIDA) return 'Salida';
  if (tipo === TipoMovimiento.DEVOLUCION) return 'Devolución';
  return String(tipo);
}

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
    @Inject(forwardRef(() => AuditoriaService))
    private auditoriaService: AuditoriaService,
    private auditoriaInventarioService: AuditoriaInventarioService,
    @Inject(forwardRef(() => InventarioTecnicoService))
    private inventarioTecnicoService: InventarioTecnicoService,
    @Inject(forwardRef(() => NumerosMedidorService))
    private numerosMedidorService: NumerosMedidorService,
    @Inject(forwardRef(() => BodegasService))
    private bodegasService: BodegasService,
  ) {}

  private async generarIdentificadorUnico(tipoMovimiento: TipoMovimiento): Promise<string> {
    // Determinar el prefijo según el tipo de movimiento
    let prefijo: string;
    switch (tipoMovimiento) {
      case TipoMovimiento.SALIDA:
        prefijo = 'SAL';
        break;
      case TipoMovimiento.ENTRADA:
        prefijo = 'ENT';
        break;
      case TipoMovimiento.DEVOLUCION:
        prefijo = 'DEV';
        break;
      default:
        prefijo = 'MOV';
    }

    // Buscar el último identificador único del mismo tipo
    const ultimoMovimiento = await this.movimientosRepository
      .createQueryBuilder('movimiento')
      .where('movimiento.identificadorUnico IS NOT NULL')
      .andWhere('movimiento.identificadorUnico LIKE :pattern', { pattern: `${prefijo}-%` })
      .andWhere('movimiento.movimientoTipo = :tipo', { tipo: tipoMovimiento })
      .orderBy('CAST(SUBSTRING(movimiento.identificadorUnico, 5) AS UNSIGNED)', 'DESC')
      .limit(1)
      .getOne();

    let siguienteNumero = 1;
    if (ultimoMovimiento?.identificadorUnico) {
      const match = ultimoMovimiento.identificadorUnico.match(new RegExp(`${prefijo}-(\\d+)`));
      if (match) {
        siguienteNumero = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefijo}-${siguienteNumero}`;
  }

  async create(createMovimientoDto: CreateMovimientoDto): Promise<MovimientoInventario[]> {
    // Generar código único para agrupar los movimientos
    const movimientoCodigo =
      createMovimientoDto.movimientoCodigo ||
      `${createMovimientoDto.movimientoTipo.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // NO generar identificador único aquí - se generará por cada movimiento individual
    // para evitar conflictos cuando se crean múltiples movimientos con el mismo código

    const movimientosCreados: MovimientoInventario[] = [];
    const inventarioCache = new Map<number, { inventarioId: number; bodegaId: number | null }>();
    const bodegaCache = new Map<number, { inventarioId: number | null; bodegaId: number | null }>();
    let defaultInventarioContext:
      | { inventarioId: number | null; bodegaId: number | null }
      | undefined;

    const cargarInventario = async (
      inventarioId?: number | null,
    ): Promise<{ inventarioId: number; bodegaId: number | null } | null> => {
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

    const cargarPorBodega = async (
      bodegaId?: number | null,
    ): Promise<{ inventarioId: number | null; bodegaId: number | null } | null> => {
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

    const obtenerContextoInventario = async (
      material: any,
    ): Promise<{ inventarioId: number | null; bodegaId: number | null }> => {
      // PRIORIDAD 1: Preferencia explícita del DTO (siempre usar este si está presente)
      // Si inventarioId es explícitamente null, retornar null (va a sede)
      if (createMovimientoDto.inventarioId === null) {
        return { inventarioId: null, bodegaId: null };
      }
      // Si inventarioId tiene un valor, cargarlo
      if (createMovimientoDto.inventarioId) {
        const context = await cargarInventario(createMovimientoDto.inventarioId);
        if (!context) {
          throw new BadRequestException('El inventario seleccionado no existe.');
        }
        // Si el inventario existe, retornarlo directamente sin buscar alternativas
        return context;
      }

      // Inventario directo del material
      const materialInventario = await cargarInventario(
        material?.inventarioId || material?.inventario?.inventarioId,
      );
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

    // oficinaId eliminado - las bodegas ahora pertenecen directamente a sedes

    // Procesar cada material del array
    for (const materialDto of createMovimientoDto.materiales) {
      // Verificar que el material existe
      let material = await this.materialesService.findOne(materialDto.materialId);
      let materialIdFinal = materialDto.materialId;
      const precioUnitario = materialDto.movimientoPrecioUnitario;

      const inventarioContexto = await obtenerContextoInventario(material);
      // Permitir movimientos sin inventarioId (se asignará después desde la lista)
      const inventarioDestino = inventarioContexto?.inventarioId || null;
      const bodegaDestino = inventarioContexto?.bodegaId || null;

      // Si es una ENTRADA con proveedor diferente, crear o encontrar variante
      if (
        createMovimientoDto.movimientoTipo === TipoMovimiento.ENTRADA &&
        createMovimientoDto.proveedorId
      ) {
        // Verificar si el proveedor es diferente al del material original
        if (material.proveedorId !== createMovimientoDto.proveedorId) {
          // Buscar si ya existe una variante con este proveedor
          const varianteExistente = await this.materialesService.findByProveedorAndCodigo(
            createMovimientoDto.proveedorId,
            material.materialCodigo,
          );

          if (varianteExistente) {
            // Usar la variante existente
            material = varianteExistente;
            materialIdFinal = varianteExistente.materialId;
          } else {
            // Crear nueva variante del material
            const nuevaVariante = await this.materialesService.createVariante(
              material,
              createMovimientoDto.proveedorId,
              inventarioDestino,
              precioUnitario,
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
          materialDto.movimientoCantidad,
        );
        if (materialFIFO) {
          materialIdFinal = materialFIFO.materialId;
        }
      }

      // Generar identificador único para este movimiento individual
      // Cada movimiento debe tener su propio identificador único, incluso si comparten el mismo código
      const identificadorUnicoMovimiento = await this.generarIdentificadorUnico(
        createMovimientoDto.movimientoTipo,
      );

      // Crear el movimiento con el materialId correcto
      // Nota: bodegaId no se guarda porque la columna no existe en la BD
      const movimientoData: any = {
        movimientoTipo: createMovimientoDto.movimientoTipo,
        materialId: materialIdFinal,
        movimientoCantidad: materialDto.movimientoCantidad,
        movimientoPrecioUnitario: precioUnitario,
        movimientoObservaciones: createMovimientoDto.movimientoObservaciones,
        instalacionId: createMovimientoDto.instalacionId || null,
        usuarioId: createMovimientoDto.usuarioId,
        proveedorId: createMovimientoDto.proveedorId || null,
        movimientoCodigo: movimientoCodigo,
        identificadorUnico: identificadorUnicoMovimiento, // Identificador único autogenerado por movimiento
        numerosMedidor:
          materialDto.numerosMedidor && materialDto.numerosMedidor.length > 0
            ? materialDto.numerosMedidor
            : null, // Guardar números de medidor en el movimiento
      };

      // Agregar información del origen (bodega o técnico) para salidas y devoluciones
      // IMPORTANTE: Si el origen es técnico, NO establecer inventarioId
      if (createMovimientoDto.origenTipo) {
        movimientoData.origenTipo = createMovimientoDto.origenTipo;
        if (createMovimientoDto.origenTipo === 'tecnico' && createMovimientoDto.tecnicoOrigenId) {
          movimientoData.tecnicoOrigenId = createMovimientoDto.tecnicoOrigenId;
          // NO establecer inventarioId cuando el origen es técnico
          movimientoData.inventarioId = null;
        } else if (createMovimientoDto.origenTipo === 'bodega') {
          // Solo establecer inventarioId si el origen es bodega
          if (inventarioDestino !== null && inventarioDestino !== undefined) {
            movimientoData.inventarioId = inventarioDestino;
          }
        }
      } else {
        // Si no hay origenTipo definido, usar inventarioId si está disponible (comportamiento legacy)
        // IMPORTANTE: Si createMovimientoDto.inventarioId es explícitamente null, no establecer inventarioId
        if (createMovimientoDto.inventarioId === null) {
          movimientoData.inventarioId = null;
        } else if (inventarioDestino !== null && inventarioDestino !== undefined) {
          movimientoData.inventarioId = inventarioDestino;
        }
      }

      const movimiento = this.movimientosRepository.create(movimientoData);
      const movimientoGuardado = (await this.movimientosRepository.save(
        movimiento,
      )) as unknown as MovimientoInventario;

      // Obtener el movimiento guardado para agregarlo a la lista
      // Usar solo los datos necesarios para evitar problemas de serialización
      if (movimientoGuardado) {
        // Registrar en auditoría de inventario
        try {
          const tipoMovimiento = createMovimientoDto.movimientoTipo;
          let tipoCambio: TipoCambioInventario;
          if (tipoMovimiento === TipoMovimiento.ENTRADA) {
            tipoCambio = TipoCambioInventario.MOVIMIENTO_ENTRADA;
          } else if (tipoMovimiento === TipoMovimiento.SALIDA) {
            tipoCambio = TipoCambioInventario.MOVIMIENTO_SALIDA;
          } else {
            tipoCambio = TipoCambioInventario.MOVIMIENTO_DEVOLUCION;
          }

          // Obtener información de bodega si existe
          let bodegaId: number | undefined = undefined;
          if (movimientoGuardado.inventarioId) {
            try {
              const inventario = await this.inventariosService.findOne(
                movimientoGuardado.inventarioId,
              );
              bodegaId = inventario.bodegaId || inventario.bodega?.bodegaId;
            } catch (error) {
              // Error silencioso
            }
          }

          await this.auditoriaInventarioService.registrarCambio({
            materialId: materialIdFinal,
            tipoCambio,
            usuarioId: createMovimientoDto.usuarioId,
            descripcion: `${getTipoLabel(tipoMovimiento)}: ${materialDto.movimientoCantidad} unidades`,
            cantidadNueva: materialDto.movimientoCantidad,
            diferencia:
              tipoMovimiento === TipoMovimiento.ENTRADA
                ? materialDto.movimientoCantidad
                : -materialDto.movimientoCantidad,
            bodegaId,
            movimientoId: movimientoGuardado.movimientoId,
            observaciones:
              movimientoGuardado.movimientoObservaciones ||
              createMovimientoDto.movimientoObservaciones,
          });
        } catch (error) {
          console.error('Error al registrar movimiento en auditoría:', error);
          // No lanzar error para no interrumpir el proceso
        }

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
          identificadorUnico: movimientoGuardado.identificadorUnico,
          movimientoEstado: movimientoGuardado.movimientoEstado,
          origenTipo: movimientoGuardado.origenTipo,
          tecnicoOrigenId: movimientoGuardado.tecnicoOrigenId,
          numerosMedidor: movimientoGuardado.numerosMedidor,
          fechaCreacion: movimientoGuardado.fechaCreacion,
          fechaActualizacion: movimientoGuardado.fechaActualizacion,
        } as any);
      }

      // Manejar números de medidor si se proporcionan
      try {
        const _material = await this.materialesService.findOne(materialIdFinal);

        // Si se proporcionan números de medidor, procesarlos (el servicio marcará automáticamente el material como medidor)
        if (materialDto.numerosMedidor && materialDto.numerosMedidor.length > 0) {
          const tipoMovimiento = createMovimientoDto.movimientoTipo;
          const esEntrada = tipoMovimiento === TipoMovimiento.ENTRADA;
          const esSalida = tipoMovimiento === TipoMovimiento.SALIDA;
          const esDevolucion = tipoMovimiento === TipoMovimiento.DEVOLUCION;

          for (const numeroMedidor of materialDto.numerosMedidor) {
            // Buscar si ya existe este número de medidor
            const numeroMedidorEntity =
              await this.numerosMedidorService.findByNumero(numeroMedidor);

            if (esEntrada) {
              // ENTRADA: Solo crear números nuevos. Los números de medidor NUNCA se repiten, incluso si ya salieron o fueron instalados
              if (!numeroMedidorEntity) {
                // Crear nuevo número de medidor
                await this.numerosMedidorService.create({
                  materialId: materialIdFinal,
                  numeroMedidor: numeroMedidor,
                  estado: EstadoNumeroMedidor.DISPONIBLE,
                });
              } else {
                // Si el número ya existe, lanzar error - los números de medidor nunca se repiten
                throw new BadRequestException(
                  `El número de medidor "${numeroMedidor}" ya existe en el sistema. Los números de medidor son únicos y nunca se repiten, incluso si ya salieron de inventario o fueron instalados.`,
                );
              }
            } else if (esSalida || esDevolucion) {
              // SALIDA/DEVOLUCIÓN: Cambiar estado según el destino
              if (!numeroMedidorEntity) {
                // Si no existe, crear con estado según el destino
                const estadoInicial =
                  createMovimientoDto.origenTipo === 'tecnico'
                    ? EstadoNumeroMedidor.ASIGNADO_TECNICO
                    : EstadoNumeroMedidor.DISPONIBLE;

                await this.numerosMedidorService.create({
                  materialId: materialIdFinal,
                  numeroMedidor: numeroMedidor,
                  estado: estadoInicial,
                  usuarioId: createMovimientoDto.tecnicoOrigenId || null,
                });
              } else {
                // Actualizar estado según el destino
                if (
                  createMovimientoDto.origenTipo === 'tecnico' &&
                  createMovimientoDto.tecnicoOrigenId
                ) {
                  // Si va a técnico, obtener inventario técnico
                  const inventarioTecnico = await this.inventarioTecnicoService.findByUsuario(
                    createMovimientoDto.tecnicoOrigenId,
                  );
                  const inventarioItem = inventarioTecnico.find(
                    (inv) =>
                      inv.materialId === materialIdFinal &&
                      inv.usuarioId === createMovimientoDto.tecnicoOrigenId,
                  );

                  await this.numerosMedidorService.update(numeroMedidorEntity.numeroMedidorId, {
                    estado: EstadoNumeroMedidor.ASIGNADO_TECNICO,
                    usuarioId: createMovimientoDto.tecnicoOrigenId,
                    inventarioTecnicoId: inventarioItem?.inventarioTecnicoId || null,
                    instalacionId: null,
                    instalacionMaterialId: null,
                  });
                } else {
                  // Si va a bodega/sede, cambiar a disponible
                  await this.numerosMedidorService.update(numeroMedidorEntity.numeroMedidorId, {
                    estado: EstadoNumeroMedidor.DISPONIBLE,
                    instalacionId: null,
                    instalacionMaterialId: null,
                    usuarioId: null,
                    inventarioTecnicoId: null,
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error al manejar números de medidor en movimiento:`, error);
        // No lanzar error para no interrumpir el proceso
      }

      // Ajustar stock según el tipo de movimiento (solo si el movimiento está completado)
      // No ajustar stock para movimientos pendientes (como las salidas automáticas)
      const movimientoCompletado =
        movimientoGuardado.movimientoEstado === EstadoMovimiento.COMPLETADA;

      if (movimientoCompletado) {
        const tipoMovimiento = createMovimientoDto.movimientoTipo;
        const tipoStr = String(tipoMovimiento).toLowerCase();
        const esEntrada = tipoStr === 'entrada' || tipoMovimiento === TipoMovimiento.ENTRADA;
        const esSalida = tipoStr === 'salida' || tipoMovimiento === TipoMovimiento.SALIDA;
        const esDevolucion =
          tipoStr === 'devolucion' || tipoMovimiento === TipoMovimiento.DEVOLUCION;

        // Si el origen es técnico, ajustar inventario técnico (para salidas, devoluciones y entradas desde técnico)
        if (createMovimientoDto.origenTipo === 'tecnico' && createMovimientoDto.tecnicoOrigenId) {
          if (esEntrada) {
            // Si es una entrada desde técnico (devolución), reducir inventario técnico y aumentar stock en sede/bodega
            await this.ajustarInventarioTecnicoMovimiento(
              materialIdFinal,
              TipoMovimiento.SALIDA, // Usar SALIDA para reducir inventario técnico
              materialDto.movimientoCantidad,
              createMovimientoDto.tecnicoOrigenId,
            );
            // Ajustar stock en sede/bodega destino
            if (
              createMovimientoDto.inventarioId === null ||
              (!bodegaDestino && !createMovimientoDto.inventarioId)
            ) {
              await this.ajustarStockSedeMovimiento(
                materialIdFinal,
                materialDto.movimientoCantidad,
              );
            } else if (bodegaDestino) {
              await this.ajustarStockMovimiento(
                materialIdFinal,
                TipoMovimiento.ENTRADA,
                materialDto.movimientoCantidad,
                bodegaDestino,
              );
            }
          } else if (esSalida || esDevolucion) {
            await this.ajustarInventarioTecnicoMovimiento(
              materialIdFinal,
              tipoMovimiento,
              materialDto.movimientoCantidad,
              createMovimientoDto.tecnicoOrigenId,
            );
          }
        }
        // Si es una ENTRADA sin bodega seleccionada y sin origen técnico, ajustar stock directamente en la sede
        else if (
          esEntrada &&
          (createMovimientoDto.inventarioId === null ||
            (!bodegaDestino && !createMovimientoDto.inventarioId))
        ) {
          await this.ajustarStockSedeMovimiento(materialIdFinal, materialDto.movimientoCantidad);
        }
        // Si el origen es bodega, ajustar stock de bodega
        else if (bodegaDestino) {
          if (esDevolucion) {
            // Asegurar que para devoluciones se reste stock
            await this.ajustarStockMovimiento(
              materialIdFinal,
              TipoMovimiento.DEVOLUCION, // Forzar el enum correcto
              materialDto.movimientoCantidad,
              bodegaDestino,
            );
          } else {
            await this.ajustarStockMovimiento(
              materialIdFinal,
              createMovimientoDto.movimientoTipo,
              materialDto.movimientoCantidad,
              bodegaDestino,
            );
          }
        }
      }
    }

    // Si es una ENTRADA y hay asignaciones a técnicos, procesarlas
    if (
      createMovimientoDto.movimientoTipo === TipoMovimiento.ENTRADA &&
      createMovimientoDto.asignacionesTecnicos &&
      createMovimientoDto.asignacionesTecnicos.length > 0
    ) {
      // Obtener el inventario de la sede para crear salidas
      // Usar el inventarioId proporcionado o el primero de los movimientos creados
      let inventarioSede: { inventarioId: number | null; bodegaId: number | null } | null = null;
      if (createMovimientoDto.inventarioId) {
        try {
          const inventario = await this.inventariosService.findOne(
            createMovimientoDto.inventarioId,
          );
          if (inventario && inventario.bodega) {
            inventarioSede = {
              inventarioId: inventario.inventarioId,
              bodegaId:
                inventario.bodegaId ||
                (typeof inventario.bodega === 'object' && 'bodegaId' in inventario.bodega
                  ? inventario.bodega.bodegaId
                  : null),
            };
          }
        } catch (error) {
          console.error('Error al buscar inventario de sede:', error);
        }
      } else if (movimientosCreados.length > 0 && movimientosCreados[0].inventarioId) {
        try {
          const inventario = await this.inventariosService.findOne(
            movimientosCreados[0].inventarioId,
          );
          if (inventario && inventario.bodega) {
            inventarioSede = {
              inventarioId: inventario.inventarioId,
              bodegaId:
                inventario.bodegaId ||
                (typeof inventario.bodega === 'object' && 'bodegaId' in inventario.bodega
                  ? inventario.bodega.bodegaId
                  : null),
            };
          }
        } catch (error) {
          console.error('Error al buscar inventario de sede:', error);
        }
      }

      // Procesar cada asignación a técnico
      for (const asignacion of createMovimientoDto.asignacionesTecnicos) {
        try {
          // Asignar materiales al técnico
          await this.inventarioTecnicoService.asignarMateriales(asignacion.usuarioId, {
            materiales: asignacion.materiales,
          });

          // Si hay inventario de sede, crear movimientos de salida automáticos
          if (inventarioSede && inventarioSede.inventarioId && inventarioSede.bodegaId) {
            const salidaCodigo = `SALIDA-TECNICO-${asignacion.usuarioId}-${Date.now()}`;

            // Crear salidas para cada material asignado
            for (const materialAsignado of asignacion.materiales) {
              try {
                // Verificar que el material existe
                await this.materialesService.findOne(materialAsignado.materialId);

                // Crear movimiento de salida desde la sede/bodega
                const salidaData: any = {
                  movimientoTipo: TipoMovimiento.SALIDA,
                  materialId: materialAsignado.materialId,
                  movimientoCantidad: materialAsignado.cantidad,
                  movimientoObservaciones: `Asignación automática a técnico desde entrada. ${createMovimientoDto.movimientoObservaciones || ''}`,
                  usuarioId: createMovimientoDto.usuarioId,
                  inventarioId: inventarioSede.inventarioId,
                  movimientoCodigo: salidaCodigo,
                  movimientoEstado: EstadoMovimiento.COMPLETADA, // Completar automáticamente
                };

                const identificadorUnicoSalida = await this.generarIdentificadorUnico(
                  TipoMovimiento.SALIDA,
                );
                salidaData.identificadorUnico = identificadorUnicoSalida;

                const salida = this.movimientosRepository.create(salidaData);
                const _salidaGuardada = (await this.movimientosRepository.save(
                  salida,
                )) as unknown as MovimientoInventario;

                // Ajustar stock (reducir de bodega/sede)
                await this.ajustarStockMovimiento(
                  materialAsignado.materialId,
                  TipoMovimiento.SALIDA,
                  materialAsignado.cantidad,
                  inventarioSede.bodegaId,
                );
              } catch (error) {
                console.error(
                  `Error al crear salida para material ${materialAsignado.materialId}:`,
                  error,
                );
                // Continuar con los demás materiales aunque falle uno
              }
            }
          }
        } catch (error) {
          console.error(`Error al asignar materiales al técnico ${asignacion.usuarioId}:`, error);
          // Continuar con los demás técnicos aunque falle uno
        }
      }
    }

    // Retornar el array de movimientos creados
    return movimientosCreados;
  }

  private async ajustarStockMovimiento(
    materialId: number,
    tipo: TipoMovimiento,
    cantidad: number,
    bodegaId: number,
  ): Promise<void> {
    // Convertir cantidad a número para asegurar que sea un número válido
    const cantidadNumerica = Number(cantidad) || 0;

    // Normalizar el tipo de movimiento (puede venir como string o enum)
    const tipoStr = String(tipo).toLowerCase();
    const esDevolucion = tipoStr === 'devolucion' || tipo === TipoMovimiento.DEVOLUCION;
    const esEntrada = tipoStr === 'entrada' || tipo === TipoMovimiento.ENTRADA;
    const esSalida = tipoStr === 'salida' || tipo === TipoMovimiento.SALIDA;

    let ajusteCantidad = 0;

    // Determinar el ajuste según el tipo de movimiento
    // IMPORTANTE: Las devoluciones DEBEN restar stock (valor negativo)
    if (esDevolucion) {
      // Las devoluciones RESTAN stock (disminuyen el inventario)
      // Forzar que siempre sea negativo, sin importar cómo venga la cantidad
      ajusteCantidad = cantidadNumerica > 0 ? -cantidadNumerica : cantidadNumerica;
      // Asegurar que sea negativo
      if (ajusteCantidad >= 0) {
        ajusteCantidad = -Math.abs(cantidadNumerica);
      }
    } else if (esEntrada) {
      ajusteCantidad = cantidadNumerica; // +cantidad (aumenta stock)
    } else if (esSalida) {
      ajusteCantidad = -cantidadNumerica; // -cantidad (disminuye stock)
    } else {
      // Si no se reconoce el tipo, no ajustar
      ajusteCantidad = 0;
    }

    // Verificación final crítica: para devoluciones, el ajuste DEBE ser negativo
    if (esDevolucion && ajusteCantidad >= 0) {
      // Si por alguna razón es positivo o cero, forzar a negativo
      ajusteCantidad = -Math.abs(cantidadNumerica);
    }

    await this.materialesService.ajustarStock(materialId, ajusteCantidad, bodegaId);
    // La sincronización ya se hace dentro de ajustarStock, pero la dejamos explícita aquí por claridad
  }

  /**
   * Ajusta el stock general del material (en sede) sin asignarlo a una bodega específica.
   * Se usa para entradas sin bodega seleccionada.
   */
  private async ajustarStockSedeMovimiento(materialId: number, cantidad: number): Promise<void> {
    const cantidadNumerica = Number(cantidad) || 0;
    await this.materialesService.ajustarStockSede(materialId, cantidadNumerica);
  }

  private async ajustarInventarioTecnicoMovimiento(
    materialId: number,
    tipo: TipoMovimiento,
    cantidad: number,
    tecnicoId: number,
  ): Promise<void> {
    // Convertir cantidad a número para asegurar que sea un número válido
    const cantidadNumerica = Number(cantidad) || 0;

    // Normalizar el tipo de movimiento (puede venir como string o enum)
    const tipoStr = String(tipo).toLowerCase();
    const esDevolucion = tipoStr === 'devolucion' || tipo === TipoMovimiento.DEVOLUCION;
    const esSalida = tipoStr === 'salida' || tipo === TipoMovimiento.SALIDA;

    // Solo procesar salidas y devoluciones desde inventario técnico
    if (!esSalida && !esDevolucion) {
      return;
    }

    try {
      // Buscar el inventario técnico existente
      const inventarioTecnico = await this.inventarioTecnicoService.findByUsuario(tecnicoId);
      const inventarioItem = inventarioTecnico.find(
        (inv) => inv.materialId === materialId && inv.usuarioId === tecnicoId,
      );

      if (inventarioItem) {
        // Calcular nueva cantidad (restar para salidas y devoluciones)
        const cantidadActual = Number(inventarioItem.cantidad || 0);
        const nuevaCantidad = Math.max(0, cantidadActual - cantidadNumerica);

        // Actualizar el inventario técnico
        await this.inventarioTecnicoService.update(inventarioItem.inventarioTecnicoId, {
          cantidad: nuevaCantidad,
        });

        // IMPORTANTE: Sincronizar el stock total del material después de actualizar inventario técnico
        await this.materialesService.sincronizarStock(materialId);
      }
    } catch (error) {
      console.error(
        `Error al ajustar inventario técnico para técnico ${tecnicoId} y material ${materialId}:`,
        error,
      );
      throw error;
    }
  }

  async findAll(
    paginationDto?: PaginationDto,
    user?: any,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    try {
      const page = paginationDto?.page || 1;
      // Si no se especifica límite o es muy grande, usar un valor razonable o sin límite
      const limit = paginationDto?.limit || 10;
      const skip = (page - 1) * limit;

      // Construir condiciones de filtrado según el rol del usuario
      let whereConditions = '';
      const queryParams: any[] = [];

      if (user) {
        const rolTipo = user.usuarioRol?.rolTipo || user.role;

        // SuperAdmin y Gerencia ven todo - no agregar condiciones
        if (rolTipo !== 'superadmin' && rolTipo !== 'gerencia') {
          // Admin ve movimientos de su sede
          if (rolTipo === 'admin' && user.usuarioSede) {
            whereConditions = `
              WHERE EXISTS (
                SELECT 1 FROM inventarios i
                INNER JOIN bodegas b ON i.bodegaId = b.bodegaId
                WHERE i.inventarioId = movimientos_inventario.inventarioId
                  AND b.sedeId = ?
              )
            `;
            queryParams.push(user.usuarioSede);
          }
          // Almacenista ve movimientos de su sede
          else if (rolTipo === 'almacenista' && user.usuarioSede) {
            whereConditions = `
              WHERE EXISTS (
                SELECT 1 FROM inventarios i
                INNER JOIN bodegas b ON i.bodegaId = b.bodegaId
                WHERE i.inventarioId = movimientos_inventario.inventarioId
                  AND b.sedeId = ?
              )
            `;
            queryParams.push(user.usuarioSede);
          }
          // Admin Internas ve movimientos de bodegas tipo internas de su sede
          else if (rolTipo === 'admin-internas' && user.usuarioSede) {
            whereConditions = `
              WHERE EXISTS (
                SELECT 1 FROM inventarios i
                INNER JOIN bodegas b ON i.bodegaId = b.bodegaId
                WHERE i.inventarioId = movimientos_inventario.inventarioId
                  AND b.sedeId = ? AND b.bodegaTipo = 'internas'
              )
            `;
            queryParams.push(user.usuarioSede);
          }
          // Admin Redes ve movimientos de bodegas tipo redes de su sede
          else if (rolTipo === 'admin-redes' && user.usuarioSede) {
            whereConditions = `
              WHERE EXISTS (
                SELECT 1 FROM inventarios i
                INNER JOIN bodegas b ON i.bodegaId = b.bodegaId
                WHERE i.inventarioId = movimientos_inventario.inventarioId
                  AND b.sedeId = ? AND b.bodegaTipo = 'redes'
              )
            `;
            queryParams.push(user.usuarioSede);
          }
          // Bodega Internas ve movimientos de bodegas de tipo internas
          else if (rolTipo === 'bodega-internas') {
            whereConditions = `
              WHERE EXISTS (
                SELECT 1 FROM inventarios i
                INNER JOIN bodegas b ON i.bodegaId = b.bodegaId
                WHERE i.inventarioId = movimientos_inventario.inventarioId
                  AND (b.bodegaTipo = 'internas' OR b.bodegaId = ?)
              )
            `;
            queryParams.push(user.usuarioBodega || 0);
          }
          // Bodega Redes ve movimientos de bodegas de tipo redes
          else if (rolTipo === 'bodega-redes') {
            whereConditions = `
              WHERE EXISTS (
                SELECT 1 FROM inventarios i
                INNER JOIN bodegas b ON i.bodegaId = b.bodegaId
                WHERE i.inventarioId = movimientos_inventario.inventarioId
                  AND (b.bodegaTipo = 'redes' OR b.bodegaId = ?)
              )
            `;
            queryParams.push(user.usuarioBodega || 0);
          }
          // Técnico y Soldador ven solo movimientos de instalaciones asignadas a ellos
          else if ((rolTipo === 'tecnico' || rolTipo === 'soldador') && user.usuarioId) {
            whereConditions = `
              WHERE (
                movimientos_inventario.usuarioId = ?
                OR movimientos_inventario.tecnicoOrigenId = ?
                OR EXISTS (
                  SELECT 1 FROM instalaciones_usuarios iu
                  WHERE iu.instalacionId = movimientos_inventario.instalacionId
                    AND iu.usuarioId = ?
                    AND iu.activo = 1
                )
              )
            `;
            queryParams.push(user.usuarioId, user.usuarioId, user.usuarioId);
          }
        }
      }

      // Obtener el total de registros con filtros
      const totalQuery = `SELECT COUNT(*) as total FROM movimientos_inventario ${whereConditions}`;
      const totalResult = await this.movimientosRepository.query(totalQuery, queryParams);
      const total = totalResult[0]?.total || 0;

      // Primero intentar con query raw para evitar problemas con TypeORM y relaciones
      // Asegurar que se incluyan origenTipo y tecnicoOrigenId explícitamente
      const selectQuery = `
        SELECT 
          movimientoId,
          materialId,
          movimientoTipo,
          movimientoCantidad,
          movimientoPrecioUnitario,
          movimientoObservaciones,
          instalacionId,
          usuarioId,
          proveedorId,
          inventarioId,
          movimientoCodigo,
          identificadorUnico,
          movimientoEstado,
          estadoMovimientoId,
          origenTipo,
          tecnicoOrigenId,
          fechaCreacion,
          fechaActualizacion
        FROM movimientos_inventario 
        ${whereConditions}
        ORDER BY fechaCreacion DESC
        LIMIT ? OFFSET ?
      `;
      const rawMovimientos = await this.movimientosRepository.query(selectQuery, [
        ...queryParams,
        limit,
        skip,
      ]);

      // Si hay movimientos, cargar relaciones manualmente
      if (rawMovimientos.length > 0) {
        const inventarioIds = Array.from(
          new Set(
            rawMovimientos
              .map((movimiento: any) => movimiento.inventarioId)
              .filter((id: any) => id !== null && id !== undefined)
              .map((id: any) => Number(id))
              .filter((id: number) => !isNaN(id)),
          ),
        );

        const inventarioMap = new Map<number, any>();
        await Promise.all(
          inventarioIds.map(async (inventarioId: number) => {
            try {
              const inventario = await this.inventariosService.findOne(inventarioId);
              inventarioMap.set(inventarioId, inventario);
            } catch (error) {
              // Error silencioso al cargar inventario
            }
          }),
        );

        const _bodegaMap = new Map<number, any>();

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
                  materialEsMedidor: material.materialEsMedidor || false,
                };
              } catch (err) {
                // Error silencioso al cargar material
              }
            }

            if (movimiento.inventarioId) {
              const inventario = inventarioMap.get(Number(movimiento.inventarioId));
              if (inventario) {
                movimientoConRelaciones.inventario = inventario;
                movimientoConRelaciones.bodega = inventario.bodega ?? null;
                movimientoConRelaciones.bodegaId =
                  inventario.bodegaId ?? inventario.bodega?.bodegaId ?? null;
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
                // Error silencioso al cargar proveedor
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
                  // usuarioOficina eliminado - las bodegas ahora pertenecen directamente a sedes
                };
              } catch (err) {
                // Error silencioso al cargar usuario
              }
            }

            // Cargar técnico origen si el movimiento viene de un técnico
            if (movimiento.origenTipo === 'tecnico' && movimiento.tecnicoOrigenId) {
              try {
                const tecnicoOrigen = await this.usersService.findOne(movimiento.tecnicoOrigenId);
                movimientoConRelaciones.tecnicoOrigen = {
                  usuarioId: tecnicoOrigen.usuarioId,
                  usuarioNombre: tecnicoOrigen.usuarioNombre,
                  usuarioApellido: tecnicoOrigen.usuarioApellido,
                };
              } catch (err) {
                // Error silencioso al cargar técnico origen
              }
            }

            // oficinaId eliminado - las bodegas ahora pertenecen directamente a sedes
            // Los datos históricos pueden tener oficinaId pero ya no se usa

            // Cargar instalación si existe
            if (movimiento.instalacionId) {
              try {
                // Usar query directa para obtener la instalación con su código
                const instalacionRaw = await this.movimientosRepository.query(
                  'SELECT instalacionId, instalacionCodigo FROM instalaciones WHERE instalacionId = ?',
                  [movimiento.instalacionId],
                );
                if (instalacionRaw && instalacionRaw.length > 0) {
                  movimientoConRelaciones.instalacion = {
                    instalacionId: instalacionRaw[0].instalacionId,
                    instalacionCodigo: instalacionRaw[0].instalacionCodigo,
                  };
                }
              } catch (err) {
                // Error silencioso al cargar instalación
              }
            }

            return movimientoConRelaciones;
          }),
        );

        return {
          data: movimientosConRelaciones,
          total: Number(total),
          page,
          limit,
        };
      }

      return {
        data: rawMovimientos,
        total: Number(total),
        page,
        limit,
      };
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

  async findOne(id: number, user?: any): Promise<any> {
    // Obtener el movimiento sin relaciones problemáticas (bodega se obtiene a través de inventario)
    // No cargar la relación instalacion para evitar que TypeORM intente cargar cliente automáticamente
    // La instalacion se carga manualmente cuando es necesario
    const movimiento = await this.movimientosRepository.findOne({
      where: { movimientoId: id },
      relations: ['usuario', 'proveedor', 'inventario', 'inventario.bodega'],
    });

    if (!movimiento) {
      throw new NotFoundException(`Movimiento con ID ${id} no encontrado`);
    }

    const rolTipo = user?.usuarioRol?.rolTipo || user?.role;
    const rolesConFiltroBodega = [
      'admin-internas',
      'admin-redes',
      'bodega-internas',
      'bodega-redes',
    ];
    if (user && rolesConFiltroBodega.includes(rolTipo)) {
      const bodegasPermitidas = await this.bodegasService.findAll(user);
      const bodegaIdMov =
        movimiento.inventario?.bodegaId ?? movimiento.inventario?.bodega?.bodegaId;
      const permitido =
        bodegaIdMov != null && bodegasPermitidas.some((b) => b.bodegaId === bodegaIdMov);
      if (!permitido) {
        throw new NotFoundException(`Movimiento con ID ${id} no encontrado`);
      }
    }

    // Cargar material manualmente
    const movimientoConRelaciones: any = { ...movimiento };

    // Parsear numerosMedidor si existe (MySQL devuelve JSON como string)
    if (movimiento.numerosMedidor) {
      try {
        movimientoConRelaciones.numerosMedidor =
          typeof movimiento.numerosMedidor === 'string'
            ? JSON.parse(movimiento.numerosMedidor)
            : movimiento.numerosMedidor;
      } catch (err) {
        // Si falla el parse, dejar como está
        movimientoConRelaciones.numerosMedidor = movimiento.numerosMedidor;
      }
    }
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
          materialEsMedidor: material.materialEsMedidor || false,
        };
      } catch (err) {
        // Error silencioso al cargar material
      }
    }

    // Asegurar que inventario tenga bodega cargada
    if (movimiento.inventario && !movimiento.inventario.bodega && movimiento.inventario.bodegaId) {
      try {
        const inventarioCompleto = await this.inventariosService.findOne(
          movimiento.inventario.inventarioId,
        );
        movimientoConRelaciones.inventario = inventarioCompleto;
      } catch (err) {
        // Error silencioso al cargar inventario
      }
    }

    // Asignar bodega desde inventario
    if (movimientoConRelaciones.inventario) {
      movimientoConRelaciones.bodega = movimientoConRelaciones.inventario.bodega ?? null;
      movimientoConRelaciones.bodegaId =
        movimientoConRelaciones.inventario.bodegaId ??
        movimientoConRelaciones.inventario.bodega?.bodegaId ??
        null;
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
        // Error silencioso al cargar proveedor
      }
    }

    // oficinaId eliminado - las bodegas ahora pertenecen directamente a sedes

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
          // usuarioOficina eliminado - las bodegas ahora pertenecen directamente a sedes
        };
      } catch (err) {
        // Error silencioso al cargar usuario
      }
    }

    return movimientoConRelaciones;
  }

  async findByCodigo(codigo: string): Promise<any[]> {
    // No cargar la relación instalacion para evitar que TypeORM intente cargar cliente automáticamente
    // La instalacion se carga manualmente cuando es necesario
    const movimientos = await this.movimientosRepository.find({
      where: { movimientoCodigo: codigo },
      relations: [
        'usuario',
        'proveedor',
        'inventario',
        'inventario.bodega',
        'inventario.bodega.sede',
      ],
    });

    // Cargar materiales manualmente para cada movimiento
    const movimientosConRelaciones = await Promise.all(
      movimientos.map(async (movimiento) => {
        const movimientoConRelaciones: any = { ...movimiento };

        // Parsear numerosMedidor si existe (MySQL devuelve JSON como string)
        if (movimiento.numerosMedidor) {
          try {
            movimientoConRelaciones.numerosMedidor =
              typeof movimiento.numerosMedidor === 'string'
                ? JSON.parse(movimiento.numerosMedidor)
                : movimiento.numerosMedidor;
          } catch (err) {
            // Si falla el parse, dejar como está
            movimientoConRelaciones.numerosMedidor = movimiento.numerosMedidor;
          }
        }

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
              materialEsMedidor: material.materialEsMedidor || false,
            };
          } catch (err) {
            // Error silencioso al cargar material
          }
        }

        // Cargar inventario si existe
        if (movimiento.inventarioId) {
          try {
            const inventarioCompleto = await this.inventariosService.findOne(
              movimiento.inventarioId,
            );
            movimientoConRelaciones.inventario = inventarioCompleto;

            // Asignar bodega desde inventario
            if (inventarioCompleto) {
              movimientoConRelaciones.bodega = inventarioCompleto.bodega ?? null;
              movimientoConRelaciones.bodegaId =
                inventarioCompleto.bodegaId ?? inventarioCompleto.bodega?.bodegaId ?? null;
            }
          } catch (err) {
            // Error silencioso al cargar inventario
          }
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
            // Error silencioso al cargar proveedor
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
              // usuarioOficina eliminado - las bodegas ahora pertenecen directamente a sedes
            };
          } catch (err) {
            // Error silencioso al cargar usuario
          }
        }

        // oficinaId eliminado - las bodegas ahora pertenecen directamente a sedes

        return movimientoConRelaciones;
      }),
    );

    return movimientosConRelaciones;
  }

  async findByInstalacion(instalacionId: number): Promise<any[]> {
    // Usar query builder con select explícito para evitar que TypeORM intente seleccionar inventarioId
    // que puede no existir en la base de datos
    // Seleccionar solo las columnas que existen en la BD
    const movimientos = await this.movimientosRepository
      .createQueryBuilder('movimiento')
      .select([
        'movimiento.movimientoId',
        'movimiento.materialId',
        'movimiento.movimientoTipo',
        'movimiento.movimientoCantidad',
        'movimiento.movimientoPrecioUnitario',
        'movimiento.movimientoObservaciones',
        'movimiento.instalacionId',
        'movimiento.usuarioId',
        'movimiento.proveedorId',
        // movimientoCodigo no se selecciona porque puede no existir en la BD
        // oficinaId eliminado - las bodegas ahora pertenecen directamente a sedes
        'movimiento.movimientoEstado',
        'movimiento.fechaCreacion',
        'movimiento.fechaActualizacion',
      ])
      .leftJoinAndSelect('movimiento.usuario', 'usuario')
      .leftJoinAndSelect(
        'movimiento.instalacion',
        'instalacion',
        'instalacion.instalacionId = movimiento.instalacionId',
      )
      .addSelect(['instalacion.instalacionId', 'instalacion.instalacionCodigo'])
      .leftJoinAndSelect('movimiento.proveedor', 'proveedor')
      .where('movimiento.instalacionId = :instalacionId', { instalacionId })
      .getMany();

    // Nota: inventarioId no se selecciona porque puede no existir en la BD
    // Se cargará manualmente más adelante si es necesario usando movimiento.inventarioId
    // que se obtiene de la consulta raw cuando se necesita

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
              materialEsMedidor: material.materialEsMedidor || false,
            };
          } catch (err) {
            // Error silencioso al cargar material
          }
        }

        // Cargar inventario si existe
        if (movimiento.inventarioId) {
          try {
            const inventarioCompleto = await this.inventariosService.findOne(
              movimiento.inventarioId,
            );
            movimientoConRelaciones.inventario = inventarioCompleto;

            // Asignar bodega desde inventario
            if (inventarioCompleto) {
              movimientoConRelaciones.bodega = inventarioCompleto.bodega ?? null;
              movimientoConRelaciones.bodegaId =
                inventarioCompleto.bodegaId ?? inventarioCompleto.bodega?.bodegaId ?? null;
            }
          } catch (err) {
            // Error silencioso al cargar inventario
          }
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
            // Error silencioso al cargar proveedor
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
              // usuarioOficina eliminado - las bodegas ahora pertenecen directamente a sedes
            };
          } catch (err) {
            // Error silencioso al cargar usuario
          }
        }

        // oficinaId eliminado - las bodegas ahora pertenecen directamente a sedes

        return movimientoConRelaciones;
      }),
    );

    return movimientosConRelaciones;
  }

  async update(
    id: number,
    updateMovimientoDto: Partial<CreateMovimientoDto>,
  ): Promise<MovimientoInventario> {
    const movimiento = await this.movimientosRepository.findOne({
      where: { movimientoId: id },
    });

    if (!movimiento) {
      throw new NotFoundException(`Movimiento con ID ${id} no encontrado`);
    }

    // Guardar valores originales para revertir stock
    const movimientoTipoOriginal = movimiento.movimientoTipo;
    const cantidadOriginal = Number(movimiento.movimientoCantidad) || 0;
    const materialIdOriginal = movimiento.materialId;
    const inventarioIdOriginal = movimiento.inventarioId;
    const movimientoCompletado = movimiento.movimientoEstado === EstadoMovimiento.COMPLETADA;

    // Revertir stock del movimiento original si estaba completado
    if (movimientoCompletado && inventarioIdOriginal) {
      try {
        const inventarioOriginal = await this.inventariosService.findOne(inventarioIdOriginal);
        const bodegaIdOriginal = inventarioOriginal.bodegaId || inventarioOriginal.bodega?.bodegaId;

        if (bodegaIdOriginal) {
          // Revertir el stock (invertir la operación original)
          let cantidadRevertir = 0;
          switch (movimientoTipoOriginal) {
            case TipoMovimiento.ENTRADA:
              cantidadRevertir = -cantidadOriginal; // Revertir entrada = restar
              break;
            case TipoMovimiento.SALIDA:
              cantidadRevertir = cantidadOriginal; // Revertir salida = sumar
              break;
            case TipoMovimiento.DEVOLUCION:
              cantidadRevertir = cantidadOriginal; // Revertir devolución = sumar (porque devolución resta stock)
              break;
          }

          await this.materialesService.ajustarStock(
            materialIdOriginal,
            cantidadRevertir,
            bodegaIdOriginal,
          );
        }
      } catch (error) {
        // Continuar con la actualización aunque falle la reversión de stock
      }
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
    // oficinaId eliminado - las bodegas ahora pertenecen directamente a sedes

    // Si hay materiales, actualizar el primer material (para movimientos únicos)
    let nuevaCantidad = cantidadOriginal;
    let nuevoMaterialId = materialIdOriginal;
    let nuevoInventarioId = inventarioIdOriginal;

    if (updateMovimientoDto.materiales && updateMovimientoDto.materiales.length > 0) {
      const primerMaterial = updateMovimientoDto.materiales[0];
      nuevoMaterialId = primerMaterial.materialId;
      nuevaCantidad = Number(primerMaterial.movimientoCantidad) || 0;
      movimiento.materialId = nuevoMaterialId;
      movimiento.movimientoCantidad = nuevaCantidad;
      movimiento.movimientoPrecioUnitario = primerMaterial.movimientoPrecioUnitario || null;
    }

    // Obtener el nuevo inventarioId (puede haber cambiado)
    nuevoInventarioId = movimiento.inventarioId || inventarioIdOriginal;

    // Guardar el movimiento actualizado
    const movimientoActualizado = (await this.movimientosRepository.save(
      movimiento,
    )) as unknown as MovimientoInventario;

    // Aplicar el nuevo ajuste de stock si el movimiento está completado
    if (movimientoCompletado && nuevoInventarioId) {
      try {
        const inventarioNuevo = await this.inventariosService.findOne(nuevoInventarioId);
        const bodegaIdNuevo = inventarioNuevo.bodegaId || inventarioNuevo.bodega?.bodegaId;

        if (bodegaIdNuevo) {
          // Aplicar el nuevo ajuste de stock usando el método privado
          await this.ajustarStockMovimiento(
            nuevoMaterialId,
            movimientoTipoOriginal,
            nuevaCantidad,
            bodegaIdNuevo,
          );
        }
      } catch (error) {
        // Continuar aunque falle el ajuste de stock
      }
    }

    return movimientoActualizado;
  }

  async remove(id: number, usuarioId: number): Promise<void> {
    // Validaciones previas
    if (!id || isNaN(id) || id <= 0) {
      throw new BadRequestException('ID de movimiento inválido');
    }

    if (!usuarioId || isNaN(usuarioId) || usuarioId <= 0) {
      throw new BadRequestException('ID de usuario inválido');
    }

    // Verificar que el movimiento existe directamente en la base de datos
    const movimiento = await this.movimientosRepository.findOne({
      where: { movimientoId: id },
    });

    if (!movimiento) {
      throw new NotFoundException(`Movimiento con ID ${id} no encontrado`);
    }

    // Guardar datos completos para auditoría
    const datosEliminados = {
      movimientoId: movimiento.movimientoId,
      materialId: movimiento.materialId,
      movimientoTipo: movimiento.movimientoTipo,
      movimientoCantidad: movimiento.movimientoCantidad,
      movimientoPrecioUnitario: movimiento.movimientoPrecioUnitario,
      movimientoObservaciones: movimiento.movimientoObservaciones,
      instalacionId: movimiento.instalacionId,
      usuarioId: movimiento.usuarioId,
      proveedorId: movimiento.proveedorId,
      inventarioId: movimiento.inventarioId,
      movimientoCodigo: movimiento.movimientoCodigo,
      identificadorUnico: movimiento.identificadorUnico,
      // oficinaId eliminado - las bodegas ahora pertenecen directamente a sedes
      movimientoEstado: movimiento.movimientoEstado,
      fechaCreacion: movimiento.fechaCreacion,
      fechaActualizacion: movimiento.fechaActualizacion,
    };

    // Revertir stock si el movimiento estaba completado y tiene inventario/bodega
    const movimientoCompletado = movimiento.movimientoEstado === EstadoMovimiento.COMPLETADA;

    if (movimientoCompletado && movimiento.inventarioId) {
      try {
        // Validar que el inventario existe
        const inventario = await this.inventariosService.findOne(movimiento.inventarioId);

        if (!inventario) {
          throw new BadRequestException(
            `Inventario con ID ${movimiento.inventarioId} no encontrado`,
          );
        }

        const bodegaId = inventario.bodegaId || inventario.bodega?.bodegaId;

        if (bodegaId) {
          // Validar que el material existe
          const material = await this.materialesService.findOne(movimiento.materialId);

          if (!material) {
            throw new BadRequestException(`Material con ID ${movimiento.materialId} no encontrado`);
          }

          // Revertir el stock (invertir la operación original)
          const tipoStr = String(movimiento.movimientoTipo).toLowerCase();
          const esDevolucion =
            tipoStr === 'devolucion' || movimiento.movimientoTipo === TipoMovimiento.DEVOLUCION;
          const esEntrada =
            tipoStr === 'entrada' || movimiento.movimientoTipo === TipoMovimiento.ENTRADA;
          const esSalida =
            tipoStr === 'salida' || movimiento.movimientoTipo === TipoMovimiento.SALIDA;

          let cantidadRevertir = 0;
          const cantidadNumerica = Number(movimiento.movimientoCantidad) || 0;

          if (cantidadNumerica <= 0) {
            throw new BadRequestException('La cantidad del movimiento debe ser mayor a cero');
          }

          if (esEntrada) {
            // Revertir entrada = restar (porque entrada suma stock)
            cantidadRevertir = -cantidadNumerica;
          } else if (esSalida) {
            // Revertir salida = sumar (porque salida resta stock)
            cantidadRevertir = cantidadNumerica;
          } else if (esDevolucion) {
            // Revertir devolución = sumar (porque devolución RESTA stock, entonces revertir es SUMAR)
            cantidadRevertir = cantidadNumerica;
          }

          await this.materialesService.ajustarStock(
            movimiento.materialId,
            cantidadRevertir,
            bodegaId,
          );

          // Manejar números de medidor si el material es medidor
          try {
            if (material.materialEsMedidor && movimiento.numerosMedidor) {
              // Parsear números de medidor si viene como string (JSON)
              let numerosMedidorArray: string[] = [];
              if (typeof movimiento.numerosMedidor === 'string') {
                try {
                  numerosMedidorArray = JSON.parse(movimiento.numerosMedidor);
                } catch {
                  numerosMedidorArray = [];
                }
              } else if (Array.isArray(movimiento.numerosMedidor)) {
                numerosMedidorArray = movimiento.numerosMedidor;
              }

              if (numerosMedidorArray && numerosMedidorArray.length > 0) {
                // Buscar los IDs de los números de medidor
                const numerosMedidorIds: number[] = [];
                for (const numeroStr of numerosMedidorArray) {
                  try {
                    const numeroEntity = await this.numerosMedidorService.findByNumero(numeroStr);
                    if (numeroEntity) {
                      numerosMedidorIds.push(numeroEntity.numeroMedidorId);
                    }
                  } catch (error) {
                    console.warn(`No se encontró número de medidor: ${numeroStr}`);
                  }
                }

                if (numerosMedidorIds.length > 0) {
                  if (esEntrada) {
                    // Si se elimina una ENTRADA: verificar si los números fueron creados en esta entrada
                    // Solo eliminar si fueron creados recientemente (fechaCreacion cercana a la fecha del movimiento)
                    // Si no, liberarlos a disponible
                    for (const numeroId of numerosMedidorIds) {
                      try {
                        const numero = await this.numerosMedidorService.findOne(numeroId);
                        if (numero) {
                          // Verificar si el número fue creado en esta entrada (misma fecha aproximadamente)
                          const fechaMovimiento = new Date(movimiento.fechaCreacion);
                          const fechaNumero = new Date(numero.fechaCreacion);
                          const diferenciaDias = Math.abs(
                            (fechaMovimiento.getTime() - fechaNumero.getTime()) /
                              (1000 * 60 * 60 * 24),
                          );

                          // Si fue creado en los últimos 2 días, probablemente fue creado en esta entrada
                          if (diferenciaDias <= 2 && numero.estado === 'disponible') {
                            // Eliminar solo si fue creado recientemente y está disponible
                            await this.numerosMedidorService.remove(numeroId);
                          } else {
                            // Si no, liberarlo a disponible (puede haber sido usado antes)
                            await this.numerosMedidorService.liberarDeInstalacion([numeroId]);
                            await this.numerosMedidorService.liberarDeTecnico([numeroId]);
                          }
                        }
                      } catch (error) {
                        console.warn(`Error al procesar número de medidor ${numeroId}:`, error);
                      }
                    }
                  } else if (esSalida || esDevolucion) {
                    // Si se elimina una SALIDA/DEVOLUCION: liberar números de medidor
                    // Primero liberar de instalación si estaban instalados
                    await this.numerosMedidorService.liberarDeInstalacion(numerosMedidorIds);
                    // Luego liberar de técnico si estaban asignados
                    await this.numerosMedidorService.liberarDeTecnico(numerosMedidorIds);
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error al manejar números de medidor durante eliminación:', error);
            // Continuar con la eliminación aunque falle el manejo de números de medidor
          }
        }
      } catch (error) {
        // Si es un error de validación, lanzarlo
        if (error instanceof BadRequestException || error instanceof NotFoundException) {
          throw error;
        }
        // Para otros errores, loguear y continuar con la eliminación
        console.error('Error al revertir stock durante eliminación:', error);
      }
    }

    // Registrar en auditoría antes de eliminar
    try {
      await this.auditoriaService.registrarEliminacion(
        TipoEntidad.MOVIMIENTO,
        movimiento.movimientoId,
        datosEliminados,
        usuarioId,
        'Eliminación de movimiento',
        `Movimiento ${movimiento.movimientoTipo} eliminado. Stock revertido.`,
      );
    } catch (error) {
      // Loguear error pero continuar con la eliminación
      console.error('Error al registrar auditoría durante eliminación:', error);
    }

    // Eliminar el movimiento - verificar nuevamente que existe antes de eliminar
    try {
      const movimientoAEliminar = await this.movimientosRepository.findOne({
        where: { movimientoId: id },
      });

      if (!movimientoAEliminar) {
        throw new NotFoundException(`Movimiento con ID ${id} ya fue eliminado o no existe`);
      }

      await this.movimientosRepository.remove(movimientoAEliminar);
    } catch (error) {
      // Si es un error de validación, lanzarlo
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Para otros errores, intentar eliminar directamente
      await this.movimientosRepository.remove(movimiento);
    }
  }

  async actualizarEstado(
    movimientoId: number,
    nuevoEstado: EstadoMovimiento,
  ): Promise<MovimientoInventario> {
    const movimiento = await this.movimientosRepository.findOne({
      where: { movimientoId },
    });

    if (!movimiento) {
      throw new NotFoundException(`Movimiento con ID ${movimientoId} no encontrado`);
    }

    const estadoAnterior = movimiento.movimientoEstado;
    const estabaCompletado = estadoAnterior === EstadoMovimiento.COMPLETADA;
    const seraCompletado = nuevoEstado === EstadoMovimiento.COMPLETADA;

    // Si el movimiento tiene inventario, ajustar stock según el cambio de estado
    if (movimiento.inventarioId) {
      try {
        const inventario = await this.inventariosService.findOne(movimiento.inventarioId);
        const bodegaId = inventario.bodegaId || inventario.bodega?.bodegaId;

        if (bodegaId) {
          // Si estaba completado y ahora no lo está, revertir el stock
          if (estabaCompletado && !seraCompletado) {
            // Revertir el stock (invertir la operación original)
            let cantidadRevertir = 0;
            switch (movimiento.movimientoTipo) {
              case TipoMovimiento.ENTRADA:
                cantidadRevertir = -Number(movimiento.movimientoCantidad); // Revertir entrada = restar
                break;
              case TipoMovimiento.SALIDA:
                cantidadRevertir = Number(movimiento.movimientoCantidad); // Revertir salida = sumar
                break;
              case TipoMovimiento.DEVOLUCION:
                cantidadRevertir = Number(movimiento.movimientoCantidad); // Revertir devolución = sumar (porque devolución resta stock)
                break;
            }
            await this.materialesService.ajustarStock(
              movimiento.materialId,
              cantidadRevertir,
              bodegaId,
            );
          }
          // Si no estaba completado y ahora sí lo está, aplicar el ajuste de stock
          else if (!estabaCompletado && seraCompletado) {
            // Asegurar que para devoluciones se use el tipo correcto
            const tipoMovimiento = movimiento.movimientoTipo;
            const tipoStr = String(tipoMovimiento).toLowerCase();
            if (tipoStr === 'devolucion' || tipoMovimiento === TipoMovimiento.DEVOLUCION) {
              await this.ajustarStockMovimiento(
                movimiento.materialId,
                TipoMovimiento.DEVOLUCION, // Forzar el enum correcto
                Number(movimiento.movimientoCantidad),
                bodegaId,
              );
            } else {
              await this.ajustarStockMovimiento(
                movimiento.materialId,
                movimiento.movimientoTipo,
                Number(movimiento.movimientoCantidad),
                bodegaId,
              );
            }
          }
        }
      } catch (error) {
        // Continuar con la actualización aunque falle el ajuste de stock
      }
    }

    movimiento.movimientoEstado = nuevoEstado;
    return (await this.movimientosRepository.save(movimiento)) as unknown as MovimientoInventario;
  }

  async findByMaterial(materialId: number): Promise<any[]> {
    // Obtener todos los movimientos del material ordenados por fecha
    const rawMovimientos = await this.movimientosRepository.query(
      `SELECT 
          m.movimientoId,
          m.materialId,
          m.movimientoTipo,
          m.movimientoCantidad,
          m.movimientoPrecioUnitario,
          m.movimientoObservaciones,
          m.instalacionId,
          m.usuarioId,
          m.proveedorId,
          m.inventarioId,
          m.movimientoCodigo,
          m.movimientoEstado,
          m.fechaCreacion,
          m.fechaActualizacion
        FROM movimientos_inventario m
        WHERE m.materialId = ?
        ORDER BY m.fechaCreacion DESC`,
      [materialId],
    );

    // Obtener material actual para cálculo de stock
    const material = await this.materialesService.findOne(materialId);

    // Cargar inventarios y bodegas
    const inventariosIds = [
      ...new Set(
        rawMovimientos
          .map((m: any) => m.inventarioId)
          .filter((id: any) => id && typeof id === 'number'),
      ),
    ] as number[];
    const inventarioMap = new Map<number, any>();

    for (const inventarioId of inventariosIds) {
      try {
        const inventario = await this.inventariosService.findOne(inventarioId);
        inventarioMap.set(inventarioId, inventario);
      } catch (err) {
        // Error silencioso
      }
    }

    // Calcular stock antes y después para cada movimiento
    // Ordenar movimientos de más antiguo a más reciente
    const movimientosOrdenados = [...rawMovimientos].sort((a, b) => {
      const fechaA = new Date(a.fechaCreacion).getTime();
      const fechaB = new Date(b.fechaCreacion).getTime();
      return fechaA - fechaB;
    });

    // Calcular stock antes y después recorriendo desde el principio
    // Empezar desde 0 y calcular stock acumulativo
    const stockPorMovimiento = new Map<number, { antes: number; despues: number }>();
    let stockAcumulado = 0; // Empezar desde 0 (stock inicial)

    for (const movimiento of movimientosOrdenados) {
      const cantidad = Number(movimiento.movimientoCantidad || 0);
      const tipo = movimiento.movimientoTipo;

      // Stock antes del movimiento (estado actual antes de aplicar este movimiento)
      const stockAntes = stockAcumulado;

      // Calcular stock después según el tipo de movimiento
      let stockDespues = stockAcumulado;
      if (tipo === 'entrada') {
        stockDespues = stockAcumulado + cantidad; // Entrada aumenta stock
      } else if (tipo === 'salida') {
        stockDespues = stockAcumulado - cantidad; // Salida disminuye stock
      } else if (tipo === 'devolucion') {
        stockDespues = stockAcumulado - cantidad; // Devolución disminuye stock
      }

      stockPorMovimiento.set(movimiento.movimientoId, {
        antes: stockAntes,
        despues: stockDespues,
      });

      // Actualizar stock acumulado para el siguiente movimiento
      stockAcumulado = stockDespues;
    }

    // Ahora procesar movimientos en orden descendente (más reciente primero) con la información de stock
    const movimientosDesc = [...rawMovimientos].sort((a, b) => {
      const fechaA = new Date(a.fechaCreacion).getTime();
      const fechaB = new Date(b.fechaCreacion).getTime();
      return fechaB - fechaA;
    });

    const movimientosConRelaciones = await Promise.all(
      movimientosDesc.map(async (movimiento: any) => {
        const movimientoConRelaciones: any = { ...movimiento };

        // Agregar información de stock
        const stockInfo = stockPorMovimiento.get(movimiento.movimientoId);
        movimientoConRelaciones.stockAntes = stockInfo?.antes ?? 0;
        movimientoConRelaciones.stockDespues = stockInfo?.despues ?? 0;

        // Cargar material
        movimientoConRelaciones.material = {
          materialId: material.materialId,
          materialCodigo: material.materialCodigo,
          materialNombre: material.materialNombre,
          materialStock: material.materialStock,
          materialEsMedidor: material.materialEsMedidor || false,
        };

        // Cargar inventario
        if (movimiento.inventarioId) {
          const inventario = inventarioMap.get(Number(movimiento.inventarioId));
          if (inventario) {
            movimientoConRelaciones.inventario = inventario;
            movimientoConRelaciones.bodega = inventario.bodega ?? null;
            movimientoConRelaciones.bodegaId =
              inventario.bodegaId ?? inventario.bodega?.bodegaId ?? null;
          }
        }

        // Cargar usuario
        if (movimiento.usuarioId) {
          try {
            const usuario = await this.usersService.findOne(movimiento.usuarioId);
            movimientoConRelaciones.usuario = {
              usuarioId: usuario.usuarioId,
              usuarioNombre: usuario.usuarioNombre,
              usuarioApellido: usuario.usuarioApellido,
              usuarioCorreo: usuario.usuarioCorreo,
            };
          } catch (err) {
            // Error silencioso
          }
        }

        // Cargar proveedor
        if (movimiento.proveedorId) {
          try {
            const proveedor = await this.proveedoresService.findOne(movimiento.proveedorId);
            movimientoConRelaciones.proveedor = {
              proveedorId: proveedor.proveedorId,
              proveedorNombre: proveedor.proveedorNombre,
            };
          } catch (err) {
            // Error silencioso
          }
        }

        // Cargar técnico origen si el movimiento viene de un técnico
        if (movimiento.origenTipo === 'tecnico' && movimiento.tecnicoOrigenId) {
          try {
            const tecnicoOrigen = await this.usersService.findOne(movimiento.tecnicoOrigenId);
            movimientoConRelaciones.tecnicoOrigen = {
              usuarioId: tecnicoOrigen.usuarioId,
              usuarioNombre: tecnicoOrigen.usuarioNombre,
              usuarioApellido: tecnicoOrigen.usuarioApellido,
            };
          } catch (err) {
            // Error silencioso
          }
        }

        return movimientoConRelaciones;
      }),
    );

    return movimientosConRelaciones;
  }

  async findByBodega(bodegaId: number, user?: any): Promise<any[]> {
    const rolTipo = user?.usuarioRol?.rolTipo || user?.role;
    const rolesConFiltroBodega = [
      'admin-internas',
      'admin-redes',
      'bodega-internas',
      'bodega-redes',
    ];
    if (user && rolesConFiltroBodega.includes(rolTipo)) {
      const bodegasPermitidas = await this.bodegasService.findAll(user);
      const permitido = bodegasPermitidas.some((b) => b.bodegaId === bodegaId);
      if (!permitido) {
        return [];
      }
    }
    // Obtener todos los inventarios de la bodega (filtrados por user si aplica)
    const allInventarios = await this.inventariosService.findAll(user);
    const inventarios = allInventarios.filter(
      (inv) => inv.bodegaId === bodegaId && inv.inventarioEstado,
    );

    if (inventarios.length === 0) {
      return [];
    }

    const inventariosIds = inventarios.map((inv) => inv.inventarioId);

    // Obtener todos los movimientos de esos inventarios
    const rawMovimientos = await this.movimientosRepository.query(
      `SELECT 
          m.movimientoId,
          m.materialId,
          m.movimientoTipo,
          m.movimientoCantidad,
          m.movimientoPrecioUnitario,
          m.movimientoObservaciones,
          m.instalacionId,
          m.usuarioId,
          m.proveedorId,
          m.inventarioId,
          m.movimientoCodigo,
          m.movimientoEstado,
          m.origenTipo,
          m.tecnicoOrigenId,
          m.fechaCreacion,
          m.fechaActualizacion
        FROM movimientos_inventario m
        WHERE m.inventarioId IN (${inventariosIds.map(() => '?').join(',')})
        ORDER BY m.fechaCreacion ASC`,
      inventariosIds,
    );

    // Calcular stock antes y después para cada movimiento por material
    const movimientosConStock = await this.calcularStockMovimientos(rawMovimientos);

    // Ordenar por fecha descendente (más reciente primero)
    const movimientosOrdenados = movimientosConStock.sort((a, b) => {
      const fechaA = new Date(a.fechaCreacion).getTime();
      const fechaB = new Date(b.fechaCreacion).getTime();
      return fechaB - fechaA;
    });

    return await this.enrichMovimientos(movimientosOrdenados);
  }

  async findBySede(sedeId: number, user?: any): Promise<any[]> {
    const rolTipo = user?.usuarioRol?.rolTipo || user?.role;
    if (
      user &&
      (rolTipo === 'admin-internas' || rolTipo === 'admin-redes') &&
      user.usuarioSede !== sedeId
    ) {
      return [];
    }
    if (user && (rolTipo === 'bodega-internas' || rolTipo === 'bodega-redes')) {
      const bodegasPermitidas = await this.bodegasService.findAll(user);
      const sedesPermitidas = new Set(bodegasPermitidas.map((b) => b.sedeId).filter(Boolean));
      if (!sedesPermitidas.has(sedeId)) {
        return [];
      }
    }
    // Obtener todas las bodegas de la sede
    const bodegas = await this.movimientosRepository.query(
      `SELECT b.bodegaId 
         FROM bodegas b
         WHERE b.sedeId = ?`,
      [sedeId],
    );

    if (bodegas.length === 0) {
      return [];
    }

    const bodegasIds = bodegas.map((b: any) => b.bodegaId);

    // Obtener todos los inventarios de esas bodegas (filtrados por user si aplica)
    const allInventarios = await this.inventariosService.findAll(user);
    const inventarios = allInventarios.filter(
      (inv) => bodegasIds.includes(inv.bodegaId) && inv.inventarioEstado,
    );

    if (inventarios.length === 0) {
      return [];
    }

    const inventariosIds = inventarios.map((inv) => inv.inventarioId);

    // Obtener todos los movimientos de esos inventarios
    const rawMovimientos = await this.movimientosRepository.query(
      `SELECT 
          m.movimientoId,
          m.materialId,
          m.movimientoTipo,
          m.movimientoCantidad,
          m.movimientoPrecioUnitario,
          m.movimientoObservaciones,
          m.instalacionId,
          m.usuarioId,
          m.proveedorId,
          m.inventarioId,
          m.movimientoCodigo,
          m.movimientoEstado,
          m.origenTipo,
          m.tecnicoOrigenId,
          m.fechaCreacion,
          m.fechaActualizacion
        FROM movimientos_inventario m
        WHERE m.inventarioId IN (${inventariosIds.map(() => '?').join(',')})
        ORDER BY m.fechaCreacion ASC`,
      inventariosIds,
    );

    // Calcular stock antes y después para cada movimiento por material
    const movimientosConStock = await this.calcularStockMovimientos(rawMovimientos);

    // Ordenar por fecha descendente (más reciente primero)
    const movimientosOrdenados = movimientosConStock.sort((a, b) => {
      const fechaA = new Date(a.fechaCreacion).getTime();
      const fechaB = new Date(b.fechaCreacion).getTime();
      return fechaB - fechaA;
    });

    return await this.enrichMovimientos(movimientosOrdenados);
  }

  async findByTecnico(usuarioId: number): Promise<any[]> {
    // Obtener todas las asignaciones del técnico desde inventario-tecnico
    const asignaciones = await this.movimientosRepository.query(
      `SELECT 
          it.inventarioTecnicoId,
          it.materialId,
          it.cantidad,
          it.fechaCreacion,
          it.fechaActualizacion
        FROM inventario_tecnicos it
        WHERE it.usuarioId = ?
        ORDER BY it.fechaCreacion ASC`,
      [usuarioId],
    );

    // Calcular stock acumulado para cada asignación
    const historialItems: any[] = [];
    const stockPorMaterial = new Map<number, number>();

    for (const asignacion of asignaciones) {
      const materialId = asignacion.materialId;
      const cantidad = Number(asignacion.cantidad || 0);

      // Stock antes es el acumulado actual del material
      const stockAntes = stockPorMaterial.get(materialId) || 0;
      const stockDespues = stockAntes + cantidad;

      // Actualizar stock acumulado
      stockPorMaterial.set(materialId, stockDespues);

      // Cargar información del material
      let material: any = null;
      try {
        const materialData = await this.materialesService.findOne(materialId);
        material = {
          materialId: materialData.materialId,
          materialCodigo: materialData.materialCodigo,
          materialNombre: materialData.materialNombre,
        };
      } catch (err) {
        // Error silencioso
      }

      historialItems.push({
        id: `asignacion-${asignacion.inventarioTecnicoId}`,
        tipo: 'asignacion',
        fecha: new Date(asignacion.fechaCreacion),
        cantidad,
        stockAntes,
        stockDespues,
        material,
        usuario: {
          usuarioId,
        },
      });
    }

    // Ordenar por fecha descendente (más reciente primero)
    return historialItems.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }

  private async calcularStockMovimientos(rawMovimientos: any[]): Promise<any[]> {
    // Agrupar movimientos por material
    const movimientosPorMaterial = new Map<number, any[]>();

    rawMovimientos.forEach((mov: any) => {
      const materialId = mov.materialId;
      if (!movimientosPorMaterial.has(materialId)) {
        movimientosPorMaterial.set(materialId, []);
      }
      movimientosPorMaterial.get(materialId)!.push(mov);
    });

    // Calcular stock para cada material
    const movimientosConStock: any[] = [];

    for (const [_materialId, movimientos] of movimientosPorMaterial.entries()) {
      // Ordenar movimientos por fecha (más antiguo primero)
      const movimientosOrdenados = movimientos.sort((a, b) => {
        const fechaA = new Date(a.fechaCreacion).getTime();
        const fechaB = new Date(b.fechaCreacion).getTime();
        return fechaA - fechaB;
      });

      let stockAcumulado = 0;

      for (const movimiento of movimientosOrdenados) {
        const cantidad = Number(movimiento.movimientoCantidad || 0);
        const tipo = movimiento.movimientoTipo;

        const stockAntes = stockAcumulado;
        let stockDespues = stockAcumulado;

        if (tipo === 'entrada') {
          stockDespues = stockAcumulado + cantidad;
        } else if (tipo === 'salida') {
          stockDespues = stockAcumulado - cantidad;
        } else if (tipo === 'devolucion') {
          stockDespues = stockAcumulado - cantidad;
        }

        movimientosConStock.push({
          ...movimiento,
          stockAntes,
          stockDespues,
        });

        stockAcumulado = stockDespues;
      }
    }

    return movimientosConStock;
  }

  private async enrichMovimientos(rawMovimientos: any[]): Promise<any[]> {
    const inventariosIds = [
      ...new Set(
        rawMovimientos
          .map((m: any) => m.inventarioId)
          .filter((id: any) => id && typeof id === 'number'),
      ),
    ] as number[];
    const inventarioMap = new Map<number, any>();

    for (const inventarioId of inventariosIds) {
      try {
        const inventario = await this.inventariosService.findOne(inventarioId);
        inventarioMap.set(inventarioId, inventario);
      } catch (err) {
        // Error silencioso
      }
    }

    return await Promise.all(
      rawMovimientos.map(async (movimiento: any) => {
        const movimientoEnriquecido: any = { ...movimiento };

        // Cargar material
        try {
          const material = await this.materialesService.findOne(movimiento.materialId);
          movimientoEnriquecido.material = {
            materialId: material.materialId,
            materialCodigo: material.materialCodigo,
            materialNombre: material.materialNombre,
            materialStock: material.materialStock,
          };
        } catch (err) {
          // Error silencioso
        }

        // Cargar inventario y bodega
        if (movimiento.inventarioId) {
          const inventario = inventarioMap.get(Number(movimiento.inventarioId));
          if (inventario) {
            movimientoEnriquecido.inventario = inventario;
            movimientoEnriquecido.bodega = inventario.bodega ?? null;
            movimientoEnriquecido.bodegaId =
              inventario.bodegaId ?? inventario.bodega?.bodegaId ?? null;
          }
        }

        // Cargar usuario
        if (movimiento.usuarioId) {
          try {
            const usuario = await this.usersService.findOne(movimiento.usuarioId);
            movimientoEnriquecido.usuario = {
              usuarioId: usuario.usuarioId,
              usuarioNombre: usuario.usuarioNombre,
              usuarioApellido: usuario.usuarioApellido,
              usuarioCorreo: usuario.usuarioCorreo,
            };
          } catch (err) {
            // Error silencioso
          }
        }

        // Cargar técnico origen si el movimiento viene de un técnico
        if (movimiento.origenTipo === 'tecnico' && movimiento.tecnicoOrigenId) {
          try {
            const tecnicoOrigen = await this.usersService.findOne(movimiento.tecnicoOrigenId);
            movimientoEnriquecido.tecnicoOrigen = {
              usuarioId: tecnicoOrigen.usuarioId,
              usuarioNombre: tecnicoOrigen.usuarioNombre,
              usuarioApellido: tecnicoOrigen.usuarioApellido,
            };
          } catch (err) {
            // Error silencioso
          }
        }

        // Cargar proveedor
        if (movimiento.proveedorId) {
          try {
            const proveedor = await this.proveedoresService.findOne(movimiento.proveedorId);
            movimientoEnriquecido.proveedor = {
              proveedorId: proveedor.proveedorId,
              proveedorNombre: proveedor.proveedorNombre,
            };
          } catch (err) {
            // Error silencioso
          }
        }

        return movimientoEnriquecido;
      }),
    );
  }

  /**
   * Verifica si un material es medidor usando el campo materialEsMedidor
   */
  private async esMaterialMedidor(material: any): Promise<boolean> {
    if (!material) {
      return false;
    }

    // Usar el campo materialEsMedidor para determinar si es medidor
    return Boolean(material.materialEsMedidor);
  }
}
