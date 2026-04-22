import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventarioTecnico } from './inventario-tecnico.entity';
import {
  CreateInventarioTecnicoDto,
  UpdateInventarioTecnicoDto,
  AssignMaterialesToTecnicoDto,
} from './dto/create-inventario-tecnico.dto';
import { MovimientosService } from '../movimientos/movimientos.service';
import { TipoMovimiento, EstadoMovimiento } from '../movimientos/movimiento-inventario.entity';
import { InventariosService } from '../inventarios/inventarios.service';
import { AsignacionesTecnicosService } from '../asignaciones-tecnicos/asignaciones-tecnicos.service';
import { MaterialesService } from '../materiales/materiales.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { UsersService } from '../users/users.service';
import { NumerosMedidorService } from '../numeros-medidor/numeros-medidor.service';
import { TransferenciasTecnicosService } from '../transferencias-tecnicos/transferencias-tecnicos.service';

@Injectable()
export class InventarioTecnicoService {
  constructor(
    @InjectRepository(InventarioTecnico)
    private inventarioTecnicoRepository: Repository<InventarioTecnico>,
    @Inject(forwardRef(() => MovimientosService))
    private movimientosService: MovimientosService,
    @Inject(forwardRef(() => InventariosService))
    private inventariosService: InventariosService,
    @Inject(forwardRef(() => AsignacionesTecnicosService))
    private asignacionesTecnicosService: AsignacionesTecnicosService,
    @Inject(forwardRef(() => MaterialesService))
    private materialesService: MaterialesService,
    @Inject(forwardRef(() => NotificacionesService))
    private notificacionesService: NotificacionesService,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    @Inject(forwardRef(() => NumerosMedidorService))
    private numerosMedidorService: NumerosMedidorService,
    @Inject(forwardRef(() => TransferenciasTecnicosService))
    private transferenciasTecnicosService: TransferenciasTecnicosService,
  ) {}

  async create(createDto: CreateInventarioTecnicoDto): Promise<InventarioTecnico> {
    // Verificar si ya existe
    const existente = await this.inventarioTecnicoRepository.findOne({
      where: {
        usuarioId: createDto.usuarioId,
        materialId: createDto.materialId,
      },
    });

    if (existente) {
      // Si existe, actualizar la cantidad
      existente.cantidad = createDto.cantidad;
      return this.inventarioTecnicoRepository.save(existente);
    }

    const inventario = this.inventarioTecnicoRepository.create(createDto);
    return this.inventarioTecnicoRepository.save(inventario);
  }

  async asignarMateriales(
    usuarioId: number,
    dto: AssignMaterialesToTecnicoDto,
    requestingUser?: any,
  ): Promise<InventarioTecnico[]> {
    const resultados: InventarioTecnico[] = [];

    // Si hay inventarioId, crear movimientos de salida automáticamente
    // Usar usuarioAsignadorId si está disponible, sino usar el usuarioId del técnico
    const usuarioAsignador = dto.usuarioAsignadorId || usuarioId;

    // El código se generará automáticamente en el servicio de asignaciones
    const asignacionCodigo: string | undefined = undefined;

    if (dto.inventarioId) {
      try {
        // Permisos por registro:
        // - Usuario registrado a bodega: solo puede asignar desde el inventario de SU bodega.
        // - Usuario registrado a sede (sin bodega): solo puede asignar desde el inventario "centro" de SU sede.
        // - Además, solo puede asignar a técnicos de SU sede (si aplica).
        const inventario = await this.inventariosService.findOne(dto.inventarioId, requestingUser);
        if (String(inventario?.bodega?.bodegaTipo || '').toLowerCase() === 'instalaciones') {
          throw new BadRequestException(
            'No se pueden asignar materiales desde la bodega de instalaciones; solo se usa para novedades de instalación.',
          );
        }
        if (requestingUser) {
          const rolTipo = String(requestingUser?.usuarioRol?.rolTipo || requestingUser?.role || '').toLowerCase();
          const isSuperadminOGerencia = rolTipo === 'superadmin' || rolTipo === 'gerencia';
          if (!isSuperadminOGerencia) {
            const userBodegaId = requestingUser?.usuarioBodega != null ? Number(requestingUser.usuarioBodega) : null;
            const userSedeId = requestingUser?.usuarioSede != null ? Number(requestingUser.usuarioSede) : null;
            const bodegaTipo = String(inventario?.bodega?.bodegaTipo || '').toLowerCase();
            if (userBodegaId != null && userBodegaId > 0) {
              if (Number(inventario.bodegaId) !== userBodegaId) {
                throw new BadRequestException(
                  'No tienes permisos para asignar materiales desde otra bodega.',
                );
              }
            } else if (userSedeId != null && userSedeId > 0) {
              if (bodegaTipo !== 'centro' || Number(inventario?.bodega?.sedeId) !== userSedeId) {
                throw new BadRequestException(
                  'No tienes permisos para asignar materiales fuera del inventario del centro operativo.',
                );
              }
            }

            // Técnico destino debe ser del mismo centro operativo
            const tecnico = await this.usersService.findOne(usuarioId, requestingUser).catch(() => null);
            if (userSedeId != null && tecnico?.usuarioSede != null && Number(tecnico.usuarioSede) !== userSedeId) {
              throw new BadRequestException(
                'Solo puedes asignar materiales a técnicos de tu mismo centro operativo.',
              );
            }
          }
        }
        const bodegaId = inventario.bodegaId ?? inventario.bodega?.bodegaId;

        if (bodegaId) {
          const salidaCodigo = `SALIDA-TECNICO-${usuarioId}-${Date.now()}`;

          // Crear movimiento de salida para cada material
          for (const material of dto.materiales) {
            try {
              // Crear el movimiento de salida
              const movimientosCreados = await this.movimientosService.create({
                movimientoTipo: TipoMovimiento.SALIDA,
                materiales: [
                  {
                    materialId: material.materialId,
                    movimientoCantidad: material.cantidad,
                  },
                ],
                inventarioId: dto.inventarioId,
                usuarioId: usuarioAsignador,
                movimientoObservaciones:
                  dto.observaciones || `Asignación de material a técnico ${usuarioId}`,
                movimientoCodigo: salidaCodigo,
              }, requestingUser);

              // Completar automáticamente el movimiento para que se reste el stock
              if (movimientosCreados && movimientosCreados.length > 0) {
                for (const movimiento of movimientosCreados) {
                  if (movimiento.movimientoEstado !== EstadoMovimiento.COMPLETADA) {
                    await this.movimientosService.actualizarEstado(
                      movimiento.movimientoId,
                      EstadoMovimiento.COMPLETADA,
                    );
                  }
                }
              }
            } catch (error) {
              console.error(`Error al crear salida para material ${material.materialId}:`, error);
              throw error; // Lanzar error para que se detenga la asignación si falla
            }
          }
        }
      } catch (error) {
        console.error('Error al crear movimientos de salida:', error);
        throw error; // Lanzar error para que se detenga la asignación si falla
      }
    }

    // NOTA: La asignación se creará después de asignar los números de medidor
    // para poder incluir los números que realmente se asignaron
    let asignacionCreada: any = null;

    // Crear notificación para el técnico sobre los materiales asignados
    try {
      // Obtener información del asignador y bodega
      let asignadorNombre = 'Sistema';
      let bodegaNombre: string | undefined = undefined;

      if (usuarioAsignador) {
        try {
          const asignador = await this.usersService.findOne(usuarioAsignador);
          asignadorNombre =
            `${asignador.usuarioNombre || ''} ${asignador.usuarioApellido || ''}`.trim() ||
            'Usuario';
        } catch (error) {
          console.error('Error al obtener datos del asignador:', error);
        }
      }

      if (dto.inventarioId) {
        try {
          const inventario = await this.inventariosService.findOne(dto.inventarioId);
          bodegaNombre = inventario.bodega?.bodegaNombre || inventario.bodega?.bodegaCodigo;
        } catch (error) {
          console.error('Error al obtener datos de la bodega:', error);
        }
      }

      await this.notificacionesService.crearNotificacionMaterialesAsignados(
        usuarioId,
        asignacionCreada?.asignacionCodigo || `ASIG-${Date.now()}`,
        dto.materiales.length,
        asignadorNombre,
        bodegaNombre,
      );
    } catch (error) {
      console.error('Error al crear notificación de materiales asignados:', error);
      // No lanzar error para no interrumpir el proceso de asignación
    }

    // Asignar materiales al técnico - Actualizar stock si existe, crear si no existe
    // Optimización: Guardar números de medidor asignados para incluirlos en la asignación
    const numerosAsignadosPorMaterial: Map<number, string[]> = new Map();
    const materialesIds = new Set<number>();

    // Procesar todos los materiales en paralelo donde sea posible
    const procesosMateriales = dto.materiales.map(async (material) => {
      const cantidadAsignada = Number(material.cantidad || 0);
      materialesIds.add(material.materialId);

      // Verificar si ya existe un registro para este técnico y material
      const existente = await this.inventarioTecnicoRepository.findOne({
        where: {
          usuarioId,
          materialId: material.materialId,
        },
      });

      let inventarioTecnicoItem: InventarioTecnico;
      if (existente) {
        // Si existe, actualizar la cantidad sumando la nueva cantidad asignada
        const cantidadActual = Number(existente.cantidad || 0);
        existente.cantidad = cantidadActual + cantidadAsignada;
        inventarioTecnicoItem = await this.inventarioTecnicoRepository.save(existente);
        resultados.push(inventarioTecnicoItem);
      } else {
        // Si no existe, crear un nuevo registro
        const nuevo = this.inventarioTecnicoRepository.create({
          usuarioId,
          materialId: material.materialId,
          cantidad: cantidadAsignada,
        });
        inventarioTecnicoItem = await this.inventarioTecnicoRepository.save(nuevo);
        resultados.push(inventarioTecnicoItem);
      }

      // Manejar números de medidor si se proporcionan
      try {
        if (cantidadAsignada > 0) {
          // Si se proporcionaron números de medidor específicos, usarlos
          if (material.numerosMedidor && material.numerosMedidor.length > 0) {
            // Guardar los números proporcionados
            numerosAsignadosPorMaterial.set(material.materialId, material.numerosMedidor);

            // Procesar números en paralelo
            const procesosNumeros = material.numerosMedidor.map(async (numeroMedidor) => {
              try {
                // Buscar si ya existe este número de medidor
                let numeroMedidorEntity =
                  await this.numerosMedidorService.findByNumero(numeroMedidor);

                if (!numeroMedidorEntity) {
                  // Crear nuevo número de medidor
                  numeroMedidorEntity = await this.numerosMedidorService.create({
                    materialId: material.materialId,
                    numeroMedidor: numeroMedidor,
                    estado: 'asignado_tecnico' as any,
                    usuarioId: usuarioId,
                    inventarioTecnicoId: inventarioTecnicoItem.inventarioTecnicoId,
                  });
                } else {
                  // Actualizar número de medidor existente
                  numeroMedidorEntity = await this.numerosMedidorService.update(
                    numeroMedidorEntity.numeroMedidorId,
                    {
                      estado: 'asignado_tecnico' as any,
                      usuarioId: usuarioId,
                      inventarioTecnicoId: inventarioTecnicoItem.inventarioTecnicoId,
                    },
                  );
                }
                return numeroMedidorEntity;
              } catch (error) {
                console.error(`Error al procesar número de medidor ${numeroMedidor}:`, error);
                return null;
              }
            });

            await Promise.all(procesosNumeros);
          } else {
            // Si no se proporcionaron números, obtener números disponibles automáticamente
            try {
              const numerosDisponibles = await this.numerosMedidorService.obtenerDisponibles(
                material.materialId,
                cantidadAsignada,
              );

              if (numerosDisponibles.length > 0) {
                await this.numerosMedidorService.asignarATecnico(
                  numerosDisponibles.map((n) => n.numeroMedidorId),
                  usuarioId,
                  inventarioTecnicoItem.inventarioTecnicoId,
                );

                // Guardar los números asignados automáticamente
                const numerosAsignados = numerosDisponibles.map((n) => n.numeroMedidor);
                numerosAsignadosPorMaterial.set(material.materialId, numerosAsignados);
              }
            } catch (error) {
              console.warn(
                `No se pudieron asignar números de medidor automáticamente para material ${material.materialId}:`,
                error.message,
              );
              // No lanzar error, solo registrar advertencia
            }
          }
        }
      } catch (error) {
        console.error(
          `Error al manejar números de medidor para material ${material.materialId}:`,
          error,
        );
        // No lanzar error para no interrumpir el proceso de asignación
      }
    });

    // Ejecutar todos los procesos de materiales en paralelo
    await Promise.all(procesosMateriales);

    // IMPORTANTE: Sincronizar el stock total de cada material después de asignar (en paralelo)
    const sincronizacionesStock = Array.from(materialesIds).map((materialId) =>
      this.materialesService.sincronizarStock(materialId).catch((error) => {
        console.error(
          `Error al sincronizar stock del material ${materialId} después de asignar a técnico:`,
          error,
        );
        // No lanzar error para no interrumpir el proceso
      }),
    );
    await Promise.all(sincronizacionesStock);

    // Crear registro de asignación completa con los números de medidor que realmente se asignaron
    if (dto.inventarioId && usuarioAsignador) {
      try {
        // Preparar materiales con números de medidor que realmente se asignaron
        // Usar el Map de números asignados que se guardó durante el proceso
        const materialesConNumeros = dto.materiales.map((m) => {
          const materialObj: any = {
            materialId: m.materialId,
            cantidad: Number(m.cantidad || 0),
          };

          // Obtener los números asignados del Map (tanto explícitos como automáticos)
          const numerosAsignados = numerosAsignadosPorMaterial.get(m.materialId);
          if (numerosAsignados && numerosAsignados.length > 0) {
            materialObj.numerosMedidor = numerosAsignados;
          } else {
            materialObj.numerosMedidor = [];
          }

          return materialObj;
        });

        asignacionCreada = await this.asignacionesTecnicosService.create({
          asignacionCodigo: asignacionCodigo, // undefined = se generará automáticamente
          numeroOrden: dto.numeroOrden,
          usuarioId,
          inventarioId: dto.inventarioId,
          usuarioAsignadorId: usuarioAsignador,
          materiales: materialesConNumeros,
          observaciones: dto.observaciones,
        });
      } catch (error: any) {
        // Si el error es por código duplicado, intentar obtener la asignación existente
        if (
          error?.code === 'ER_DUP_ENTRY' ||
          (error?.message && error.message.includes('Duplicate entry'))
        ) {
          console.warn(
            '⚠️ Código de asignación duplicado detectado. Intentando obtener asignación existente...',
          );

          // Intentar obtener la asignación existente
          try {
            const codigoMatch = error?.message?.match(/Duplicate entry '([^']+)'/);
            if (codigoMatch && codigoMatch[1]) {
              const codigoDuplicado = codigoMatch[1];
              // Usar findByCodigo si existe, sino buscar manualmente
              if (this.asignacionesTecnicosService.findByCodigo) {
                asignacionCreada =
                  await this.asignacionesTecnicosService.findByCodigo(codigoDuplicado);
              } else {
                // Fallback: buscar en todas las asignaciones
                const resultadoAsignaciones = await this.asignacionesTecnicosService.findAll({
                  page: 1,
                  limit: 10000,
                });
                const todasAsignaciones = Array.isArray(resultadoAsignaciones)
                  ? resultadoAsignaciones
                  : resultadoAsignaciones.data;
                asignacionCreada =
                  todasAsignaciones.find((a: any) => a.asignacionCodigo === codigoDuplicado) ||
                  null;
              }

              if (asignacionCreada) {
                console.log('✅ Asignación existente encontrada con código:', codigoDuplicado);
              } else {
                console.warn(
                  '⚠️ No se encontró la asignación con código duplicado:',
                  codigoDuplicado,
                );
              }
            }
          } catch (lookupError) {
            console.error('Error al buscar asignación existente:', lookupError);
          }
        } else {
          console.error('Error al crear registro de asignación:', error);
          // No lanzar error para no interrumpir el proceso, pero registrar el error
        }
      }
    }

    return resultados;
  }

  async retornarMaterialesABodega(
    usuarioId: number,
    dto: import('./dto/create-inventario-tecnico.dto').ReturnMaterialesToBodegaDto,
    requestingUser?: any,
  ) {
    if (!dto?.bodegaDestinoId) {
      throw new BadRequestException('bodegaDestinoId es requerido');
    }
    if (!dto?.materiales || dto.materiales.length === 0) {
      throw new BadRequestException('Debe enviar al menos un material');
    }

    // Validar sede (no permitir entre centros operativos)
    const tecnico = await this.usersService.findOne(usuarioId, requestingUser).catch(() => null);
    if (!tecnico) throw new NotFoundException('Técnico no encontrado');

    const inventarioDestino = await this.inventariosService.findOrCreateByBodega(
      Number(dto.bodegaDestinoId),
    );
    if (String(inventarioDestino?.bodega?.bodegaTipo || '').toLowerCase() === 'instalaciones') {
      throw new BadRequestException(
        'No se puede retornar material a la bodega de instalaciones; solo se usa para novedades de instalación.',
      );
    }

    const sedeTecnico = tecnico?.usuarioSede != null ? Number(tecnico.usuarioSede) : null;
    const sedeBodegaDestino =
      inventarioDestino?.bodega?.sedeId != null ? Number(inventarioDestino.bodega.sedeId) : null;
    if (sedeTecnico != null && sedeBodegaDestino != null && sedeTecnico !== sedeBodegaDestino) {
      throw new BadRequestException(
        'No se permite retornar materiales entre centros operativos diferentes.',
      );
    }

    const usuarioAsignador = dto.usuarioAsignadorId || requestingUser?.usuarioId || usuarioId;
    const codigo = `TRASLADO-TECNICO-BODEGA-${usuarioId}-${Date.now()}`;

    // 1) Salida desde técnico (descuenta inventario técnico)
    for (const m of dto.materiales) {
      await this.movimientosService.create(
        {
          movimientoTipo: TipoMovimiento.SALIDA,
          materiales: [
            {
              materialId: m.materialId,
              movimientoCantidad: m.cantidad,
              numerosMedidor: m.numerosMedidor,
            } as any,
          ],
          usuarioId: usuarioAsignador,
          movimientoCodigo: codigo,
          movimientoObservaciones: dto.observaciones || 'Retorno de materiales de técnico a bodega',
          numeroOrden: dto.numeroOrden,
          origenTipo: 'tecnico',
          tecnicoOrigenId: usuarioId,
          inventarioId: null,
        } as any,
        requestingUser,
      );
    }

    // 2) Entrada hacia bodega destino (aumenta stock)
    for (const m of dto.materiales) {
      await this.movimientosService.create(
        {
          movimientoTipo: TipoMovimiento.ENTRADA,
          materiales: [
            {
              materialId: m.materialId,
              movimientoCantidad: m.cantidad,
              numerosMedidor: m.numerosMedidor,
            } as any,
          ],
          usuarioId: usuarioAsignador,
          inventarioId: inventarioDestino.inventarioId,
          movimientoCodigo: codigo,
          movimientoObservaciones: dto.observaciones || 'Retorno de materiales de técnico a bodega',
          numeroOrden: dto.numeroOrden,
        } as any,
        requestingUser,
      );
    }

    return this.findByUsuario(usuarioId, requestingUser);
  }

  async transferirMaterialesEntreTecnicos(
    usuarioOrigenId: number,
    dto: import('./dto/create-inventario-tecnico.dto').TransferMaterialesEntreTecnicosDto,
    requestingUser?: any,
  ) {
    if (!dto?.usuarioDestinoId) {
      throw new BadRequestException('usuarioDestinoId es requerido');
    }
    if (Number(dto.usuarioDestinoId) === Number(usuarioOrigenId)) {
      throw new BadRequestException('El técnico origen y destino no pueden ser el mismo');
    }
    if (!dto?.materiales || dto.materiales.length === 0) {
      throw new BadRequestException('Debe enviar al menos un material');
    }

    const [tecnicoOrigen, tecnicoDestino] = await Promise.all([
      this.usersService.findOne(usuarioOrigenId, requestingUser).catch(() => null),
      this.usersService.findOne(Number(dto.usuarioDestinoId), requestingUser).catch(() => null),
    ]);
    if (!tecnicoOrigen) throw new NotFoundException('Técnico origen no encontrado');
    if (!tecnicoDestino) throw new NotFoundException('Técnico destino no encontrado');

    const sedeOrigen =
      tecnicoOrigen?.usuarioSede != null ? Number(tecnicoOrigen.usuarioSede) : Number.NaN;
    const sedeDestino =
      tecnicoDestino?.usuarioSede != null ? Number(tecnicoDestino.usuarioSede) : Number.NaN;
    if (!Number.isFinite(sedeOrigen) || !Number.isFinite(sedeDestino) || sedeOrigen <= 0 || sedeDestino <= 0) {
      throw new BadRequestException(
        'Ambos técnicos deben tener centro operativo (sede) definido para transferir inventario entre técnicos.',
      );
    }
    if (sedeOrigen !== sedeDestino) {
      throw new BadRequestException(
        'No se permite trasladar materiales entre técnicos de centros operativos diferentes.',
      );
    }

    // 1) Validar disponibilidad en inventario del técnico origen
    const inventarioOrigen = await this.inventarioTecnicoRepository.find({
      where: { usuarioId: usuarioOrigenId },
      relations: ['material', 'material.categoria'],
    });
    const byMaterialOrigen = new Map<number, InventarioTecnico>();
    for (const it of inventarioOrigen) {
      if (!byMaterialOrigen.has(it.materialId)) byMaterialOrigen.set(it.materialId, it);
      else {
        // Consolidar cantidad (por si hay duplicados legacy)
        const acc = byMaterialOrigen.get(it.materialId)!;
        acc.cantidad = Number(acc.cantidad || 0) + Number(it.cantidad || 0);
      }
    }

    const usuarioAsignador = dto.usuarioAsignadorId || requestingUser?.usuarioId || usuarioOrigenId;
    const codigo = `TRASLADO-TECNICO-TECNICO-${usuarioOrigenId}-${dto.usuarioDestinoId}-${Date.now()}`;

    for (const m of dto.materiales) {
      const materialId = Number(m.materialId);
      const cantidad = Number(m.cantidad || 0);
      if (!materialId || cantidad <= 0) continue;

      const itemOrigen = byMaterialOrigen.get(materialId);
      const disponible = Number(itemOrigen?.cantidad || 0);
      if (disponible < cantidad) {
        throw new BadRequestException(
          `Stock insuficiente en técnico origen para material ${materialId}. Disponible: ${disponible}, solicitado: ${cantidad}`,
        );
      }

      // 2) Si es medidor y vienen números, reasignarlos al técnico destino
      if (m.numerosMedidor && Array.isArray(m.numerosMedidor) && m.numerosMedidor.length > 0) {
        const numeros = m.numerosMedidor;
        // Validar que existan y pertenezcan al técnico origen
        for (const num of numeros) {
          const nm = await this.numerosMedidorService.findByNumero(String(num));
          if (!nm) throw new NotFoundException(`Número de medidor "${num}" no encontrado`);
          if (nm.usuarioId != null && Number(nm.usuarioId) !== usuarioOrigenId) {
            throw new BadRequestException(
              `El número de medidor "${num}" no pertenece al técnico origen.`,
            );
          }
        }
      }

      // 3) Descontar del técnico origen (inventario_tecnico)
      // Buscar registro real (no consolidado) para actualizar: el primero del query
      const registroOrigen = inventarioOrigen.find((x) => Number(x.materialId) === materialId);
      if (!registroOrigen) {
        throw new BadRequestException(`No se encontró inventario del técnico origen para material ${materialId}`);
      }
      const nuevaCantOrigen = Number(registroOrigen.cantidad || 0) - cantidad;
      if (nuevaCantOrigen < 0) {
        throw new BadRequestException(`Stock insuficiente en técnico origen para material ${materialId}`);
      }
      await this.inventarioTecnicoRepository.save({
        ...registroOrigen,
        cantidad: nuevaCantOrigen,
      });

      // 4) Sumar al técnico destino (crear o actualizar)
      let registroDestino = await this.inventarioTecnicoRepository.findOne({
        where: { usuarioId: Number(dto.usuarioDestinoId), materialId },
      });
      if (!registroDestino) {
        registroDestino = await this.inventarioTecnicoRepository.save({
          usuarioId: Number(dto.usuarioDestinoId),
          materialId,
          cantidad: cantidad,
        } as any);
      } else {
        registroDestino.cantidad = Number(registroDestino.cantidad || 0) + cantidad;
        registroDestino = await this.inventarioTecnicoRepository.save(registroDestino);
      }

      // 5) Reasignar números de medidor al técnico destino si aplica (por IDs)
      if (m.numerosMedidor && Array.isArray(m.numerosMedidor) && m.numerosMedidor.length > 0) {
        const ids: number[] = [];
        for (const num of m.numerosMedidor) {
          const nm = await this.numerosMedidorService.findByNumero(String(num));
          if (nm?.numeroMedidorId) ids.push(nm.numeroMedidorId);
        }
        if (ids.length > 0) {
          await this.numerosMedidorService.asignarATecnico(
            ids,
            Number(dto.usuarioDestinoId),
            registroDestino.inventarioTecnicoId,
          );
        }
      }

      // 6) Movimiento solo trazabilidad: el stock en inventario_tecnico ya se ajustó arriba.
      // Si el movimiento queda COMPLETADA por defecto, MovimientosService volvería a descontar del técnico origen.
      await this.movimientosService.create(
        {
          movimientoTipo: TipoMovimiento.SALIDA,
          materiales: [
            {
              materialId,
              movimientoCantidad: cantidad,
              numerosMedidor: m.numerosMedidor,
            } as any,
          ],
          usuarioId: usuarioAsignador,
          movimientoCodigo: codigo,
          movimientoObservaciones:
            dto.observaciones ||
            `Traslado entre técnicos: ${usuarioOrigenId} → ${dto.usuarioDestinoId}`,
          numeroOrden: dto.numeroOrden,
          origenTipo: 'tecnico',
          tecnicoOrigenId: usuarioOrigenId,
          inventarioId: null,
          movimientoEstado: EstadoMovimiento.PENDIENTE,
        } as any,
        requestingUser,
      );
    }

    // Devolver inventario actualizado de ambos técnicos
    const [invOrigenUpd, invDestUpd] = await Promise.all([
      this.findByUsuario(usuarioOrigenId, requestingUser),
      this.findByUsuario(Number(dto.usuarioDestinoId), requestingUser),
    ]);

    // Persistir auditoría operativa para permitir reversión posterior (eliminación)
    try {
      await this.transferenciasTecnicosService.create({
        codigo,
        usuarioOrigenId,
        usuarioDestinoId: Number(dto.usuarioDestinoId),
        materiales: dto.materiales as any,
        numeroOrden: dto.numeroOrden || null,
        observaciones: dto.observaciones || null,
        usuarioAsignadorId: usuarioAsignador || null,
      } as any);
    } catch (_e) {
      // no bloquear el flujo por auditoría
    }

    return { origen: invOrigenUpd, destino: invDestUpd };
  }

  async findAll(): Promise<InventarioTecnico[]> {
    return this.inventarioTecnicoRepository.find({
      relations: ['usuario', 'material'],
    });
  }

  async findByUsuario(
    usuarioId: number,
    requestingUser?: { usuarioRol?: { rolTipo: string }; role?: string; usuarioSede?: number },
  ): Promise<InventarioTecnico[]> {
    const rolTipo = requestingUser?.usuarioRol?.rolTipo || requestingUser?.role;
    if (rolTipo === 'almacenista') {
      const tecnico = await this.usersService.findOne(usuarioId, requestingUser);
      const sedeAlmacenista = requestingUser?.usuarioSede;
      if (sedeAlmacenista != null && tecnico.usuarioSede !== sedeAlmacenista) {
        throw new ForbiddenException(
          'Solo puede ver el inventario de técnicos de su mismo centro operativo',
        );
      }
    }

    const inventarios = await this.inventarioTecnicoRepository.find({
      where: { usuarioId },
      relations: ['material', 'material.categoria', 'material.unidadMedida', 'usuario'],
    });

    // Agrupar por materialId y sumar cantidades para evitar duplicados
    const materialesAgrupados = new Map<number, InventarioTecnico>();

    inventarios.forEach((item) => {
      const materialId = item.materialId;
      const cantidad = Number(item.cantidad || 0);

      if (materialesAgrupados.has(materialId)) {
        // Si ya existe, sumar la cantidad manteniendo todas las relaciones
        const existente = materialesAgrupados.get(materialId)!;
        existente.cantidad = Number(existente.cantidad || 0) + cantidad;
      } else {
        // Si no existe, agregarlo manteniendo todas las relaciones del material
        materialesAgrupados.set(materialId, {
          ...item,
          cantidad,
          material: item.material, // Asegurar que la relación material se mantenga
        });
      }
    });

    // Convertir el Map a un array y devolverlo
    return Array.from(materialesAgrupados.values());
  }

  async findByMaterial(materialId: number): Promise<InventarioTecnico[]> {
    return this.inventarioTecnicoRepository.find({
      where: { materialId },
      relations: ['usuario', 'usuario.bodega', 'material'],
    });
  }

  async findOne(id: number): Promise<InventarioTecnico> {
    const inventario = await this.inventarioTecnicoRepository.findOne({
      where: { inventarioTecnicoId: id },
      relations: ['usuario', 'material'],
    });

    if (!inventario) {
      throw new NotFoundException(`Inventario técnico con ID ${id} no encontrado`);
    }

    return inventario;
  }

  async update(id: number, updateDto: UpdateInventarioTecnicoDto): Promise<InventarioTecnico> {
    const inventario = await this.findOne(id);
    const materialId = inventario.materialId;
    Object.assign(inventario, updateDto);
    const resultado = await this.inventarioTecnicoRepository.save(inventario);

    // IMPORTANTE: Sincronizar el stock total del material después de actualizar
    try {
      await this.materialesService.sincronizarStock(materialId);
    } catch (error) {
      console.error(
        `Error al sincronizar stock del material ${materialId} después de actualizar inventario técnico:`,
        error,
      );
      // No lanzar error para no interrumpir el proceso
    }

    return resultado;
  }

  async remove(id: number): Promise<void> {
    const inventario = await this.findOne(id);
    const materialId = inventario.materialId;
    const usuarioId = inventario.usuarioId;

    // Liberar números de medidor asignados antes de eliminar
    try {
      const numerosMedidor = await this.numerosMedidorService.findByUsuario(usuarioId);
      const numerosDelMaterial = numerosMedidor.filter(
        (n) =>
          n.materialId === materialId &&
          n.usuarioId === usuarioId &&
          (n.estado === 'asignado_tecnico' || n.estado === 'en_instalacion'),
      );

      if (numerosDelMaterial.length > 0) {
        await this.numerosMedidorService.liberarDeTecnico(
          numerosDelMaterial.map((n) => n.numeroMedidorId),
        );
      }
    } catch (error) {
      console.error(`Error al liberar números de medidor al eliminar inventario técnico:`, error);
      // Continuar con la eliminación aunque falle la liberación
    }

    await this.inventarioTecnicoRepository.remove(inventario);

    // IMPORTANTE: Sincronizar el stock total del material después de eliminar
    try {
      await this.materialesService.sincronizarStock(materialId);
    } catch (error) {
      console.error(
        `Error al sincronizar stock del material ${materialId} después de eliminar inventario técnico:`,
        error,
      );
      // No lanzar error para no interrumpir el proceso
    }
  }

  async removeByUsuarioAndMaterial(usuarioId: number, materialId: number): Promise<void> {
    const inventario = await this.inventarioTecnicoRepository.findOne({
      where: { usuarioId, materialId },
    });

    if (inventario) {
      // Liberar números de medidor asignados antes de eliminar
      try {
        const numerosMedidor = await this.numerosMedidorService.findByUsuario(usuarioId);
        const numerosDelMaterial = numerosMedidor.filter((n) => n.materialId === materialId);

        if (numerosDelMaterial.length > 0) {
          await this.numerosMedidorService.liberarDeTecnico(
            numerosDelMaterial.map((n) => n.numeroMedidorId),
          );
        }
      } catch (error) {
        console.error(`Error al liberar números de medidor al eliminar inventario técnico:`, error);
        // Continuar con la eliminación aunque falle la liberación
      }

      await this.inventarioTecnicoRepository.remove(inventario);
    }
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
