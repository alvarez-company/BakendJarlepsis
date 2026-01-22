import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { AsignacionTecnico } from './asignacion-tecnico.entity';
import { CreateAsignacionTecnicoDto } from './dto/create-asignacion-tecnico.dto';
import { MovimientosService } from '../movimientos/movimientos.service';
import { InventarioTecnicoService } from '../inventario-tecnico/inventario-tecnico.service';
import { NumerosMedidorService } from '../numeros-medidor/numeros-medidor.service';
import { MaterialesService } from '../materiales/materiales.service';
import { InventariosService } from '../inventarios/inventarios.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { TipoEntidad } from '../auditoria/auditoria.entity';

@Injectable()
export class AsignacionesTecnicosService {
  constructor(
    @InjectRepository(AsignacionTecnico)
    private asignacionesRepository: Repository<AsignacionTecnico>,
    @Inject(forwardRef(() => MovimientosService))
    private movimientosService: MovimientosService,
    @Inject(forwardRef(() => InventarioTecnicoService))
    private inventarioTecnicoService: InventarioTecnicoService,
    @Inject(forwardRef(() => NumerosMedidorService))
    private numerosMedidorService: NumerosMedidorService,
    @Inject(forwardRef(() => MaterialesService))
    private materialesService: MaterialesService,
    @Inject(forwardRef(() => InventariosService))
    private inventariosService: InventariosService,
    @Inject(forwardRef(() => AuditoriaService))
    private auditoriaService: AuditoriaService,
  ) {}

  private async generarCodigoAsignacion(): Promise<string> {
    // Buscar el último código de asignación con formato corto (ASIG-N)
    // Ordenar por ID descendente para obtener el más reciente
    const ultimaAsignacion = await this.asignacionesRepository
      .createQueryBuilder('asignacion')
      .where('asignacion.asignacionCodigo IS NOT NULL')
      .andWhere('asignacion.asignacionCodigo REGEXP :pattern', { pattern: '^ASIG-[0-9]+$' })
      .orderBy('asignacion.asignacionTecnicoId', 'DESC')
      .limit(1)
      .getOne();

    let siguienteNumero = 1;
    if (ultimaAsignacion?.asignacionCodigo) {
      const match = ultimaAsignacion.asignacionCodigo.match(/^ASIG-(\d+)$/);
      if (match && match[1]) {
        siguienteNumero = parseInt(match[1], 10) + 1;
      }
    }

    // Intentar generar un código único hasta 10 veces para evitar condiciones de carrera
    let codigo = `ASIG-${siguienteNumero}`;
    let intentos = 0;
    const maxIntentos = 10;

    while (intentos < maxIntentos) {
      const existe = await this.asignacionesRepository.findOne({
        where: { asignacionCodigo: codigo },
      });

      if (!existe) {
        return codigo; // Código único encontrado
      }

      // Si existe, incrementar el número y intentar de nuevo
      siguienteNumero++;
      codigo = `ASIG-${siguienteNumero}`;
      intentos++;
    }

    // Si después de 10 intentos no encontramos uno único, usar timestamp como fallback
    return `ASIG-${Date.now()}`;
  }

  async create(createDto: CreateAsignacionTecnicoDto, user?: any): Promise<AsignacionTecnico> {
    // Validar que bodega-internas y bodega-redes no puedan asignar material
    if (user) {
      const rolTipo = user.usuarioRol?.rolTipo || user.role;
      if (rolTipo === 'bodega-internas' || rolTipo === 'bodega-redes') {
        throw new BadRequestException(
          'Los roles de Bodega Internas y Bodega Redes no pueden asignar material',
        );
      }
    }

    // Si no se proporciona código, generar uno automáticamente
    if (!createDto.asignacionCodigo) {
      createDto.asignacionCodigo = await this.generarCodigoAsignacion();
    }

    try {
      const asignacion = this.asignacionesRepository.create(createDto);
      return await this.asignacionesRepository.save(asignacion);
    } catch (error: any) {
      // Si el error es por código duplicado, intentar obtener la asignación existente
      if (error instanceof QueryFailedError && error.message?.includes('Duplicate entry')) {
        const codigoMatch = error.message.match(/Duplicate entry '([^']+)'/);
        if (codigoMatch && codigoMatch[1]) {
          const codigoDuplicado = codigoMatch[1];
          // Intentar obtener la asignación existente por código
          const asignacionExistente = await this.asignacionesRepository.findOne({
            where: { asignacionCodigo: codigoDuplicado },
            relations: ['usuario', 'inventario', 'inventario.bodega', 'usuarioAsignador'],
          });

          if (asignacionExistente) {
            // Si existe, retornarla (la asignación ya se creó correctamente)
            return asignacionExistente;
          }
        }
      }
      // Si no es un error de duplicado o no se encontró la asignación existente, lanzar el error
      throw error;
    }
  }

  async findAll(
    paginationDto?: any,
  ): Promise<{ data: AsignacionTecnico[]; total: number; page: number; limit: number }> {
    const page = paginationDto?.page || 1;
    const limit = paginationDto?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.asignacionesRepository
      .createQueryBuilder('asignacion')
      .leftJoinAndSelect('asignacion.usuario', 'usuario')
      .leftJoinAndSelect('asignacion.inventario', 'inventario')
      .leftJoinAndSelect('inventario.bodega', 'bodega')
      .leftJoinAndSelect('bodega.sede', 'sede')
      .leftJoinAndSelect('asignacion.usuarioAsignador', 'usuarioAsignador')
      .orderBy('asignacion.fechaCreacion', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<AsignacionTecnico> {
    const asignacion = await this.asignacionesRepository.findOne({
      where: { asignacionTecnicoId: id },
      relations: [
        'usuario',
        'inventario',
        'inventario.bodega',
        'inventario.bodega.sede',
        'usuarioAsignador',
      ],
    });

    if (!asignacion) {
      throw new NotFoundException(`Asignación con ID ${id} no encontrada`);
    }

    return asignacion;
  }

  async findByUsuario(usuarioId: number): Promise<AsignacionTecnico[]> {
    return this.asignacionesRepository.find({
      where: { usuarioId },
      relations: [
        'usuario',
        'inventario',
        'inventario.bodega',
        'inventario.bodega.sede',
        'usuarioAsignador',
      ],
      order: { fechaCreacion: 'DESC' },
    });
  }

  async findByCodigo(codigo: string): Promise<AsignacionTecnico | null> {
    return this.asignacionesRepository.findOne({
      where: { asignacionCodigo: codigo },
      relations: [
        'usuario',
        'inventario',
        'inventario.bodega',
        'inventario.bodega.sede',
        'usuarioAsignador',
      ],
    });
  }

  async update(id: number, updateDto: Partial<AsignacionTecnico>): Promise<AsignacionTecnico> {
    const asignacion = await this.findOne(id);
    Object.assign(asignacion, updateDto);
    return await this.asignacionesRepository.save(asignacion);
  }

  async aprobar(id: number): Promise<AsignacionTecnico> {
    return this.update(id, { asignacionEstado: 'aprobada' });
  }

  async rechazar(id: number): Promise<AsignacionTecnico> {
    return this.update(id, { asignacionEstado: 'rechazada' });
  }

  async remove(id: number, usuarioId: number): Promise<void> {
    const asignacion = await this.findOne(id);

    // Guardar datos completos para auditoría
    const datosEliminados = {
      asignacionTecnicoId: asignacion.asignacionTecnicoId,
      asignacionCodigo: asignacion.asignacionCodigo,
      usuarioId: asignacion.usuarioId,
      inventarioId: asignacion.inventarioId,
      usuarioAsignadorId: asignacion.usuarioAsignadorId,
      materiales: asignacion.materiales,
      observaciones: asignacion.observaciones,
      asignacionEstado: asignacion.asignacionEstado,
      fechaCreacion: asignacion.fechaCreacion,
      fechaActualizacion: asignacion.fechaActualizacion,
    };

    // Revertir todo lo relacionado con la asignación
    try {
      // 1. Buscar y eliminar movimientos de salida asociados
      // Los movimientos de salida se crean con observaciones que incluyen información de la asignación
      try {
        const inventario = await this.inventariosService.findOne(asignacion.inventarioId);
        if (inventario) {
          // Buscar movimientos de salida relacionados con esta asignación
          // Los movimientos tienen observaciones como "Asignación de material a técnico {usuarioId}"
          const resultadoMovimientos = await this.movimientosService.findAll({
            page: 1,
            limit: 10000,
          });
          const todosMovimientos = Array.isArray(resultadoMovimientos)
            ? resultadoMovimientos
            : resultadoMovimientos.data;
          const movimientosAsociados = todosMovimientos.filter((m) => {
            const esSalida = m.movimientoTipo === 'salida';
            const mismoInventario = m.inventarioId === asignacion.inventarioId;
            const observacionIncluyeAsignacion =
              m.movimientoObservaciones?.includes(`técnico ${asignacion.usuarioId}`) ||
              m.movimientoObservaciones?.includes('Asignación de material');

            return esSalida && mismoInventario && observacionIncluyeAsignacion;
          });

          // Eliminar cada movimiento de salida que corresponda a los materiales de esta asignación
          for (const movimiento of movimientosAsociados) {
            try {
              // Verificar que el movimiento está relacionado con esta asignación
              // comparando materiales y cantidades
              const materialAsignacion = asignacion.materiales.find(
                (m: any) => m.materialId === movimiento.materialId,
              );

              if (
                materialAsignacion &&
                Math.abs(
                  Number(movimiento.movimientoCantidad) - Number(materialAsignacion.cantidad),
                ) < 0.01
              ) {
                await this.movimientosService.remove(movimiento.movimientoId, usuarioId);
              }
            } catch (error) {
              console.error(
                `Error al eliminar movimiento de salida ${movimiento.movimientoId}:`,
                error,
              );
            }
          }
        }
      } catch (error) {
        console.error('Error al buscar y eliminar movimientos de salida asociados:', error);
      }

      // 2. Liberar números de medidor asignados al técnico
      if (asignacion.materiales && asignacion.materiales.length > 0) {
        for (const material of asignacion.materiales) {
          try {
            if (material.numerosMedidor && material.numerosMedidor.length > 0) {
              // Buscar los IDs de los números de medidor
              const numerosMedidorIds: number[] = [];
              for (const numeroStr of material.numerosMedidor) {
                try {
                  const numeroEntity = await this.numerosMedidorService.findByNumero(numeroStr);
                  if (
                    numeroEntity &&
                    numeroEntity.usuarioId === asignacion.usuarioId &&
                    numeroEntity.estado === 'asignado_tecnico'
                  ) {
                    numerosMedidorIds.push(numeroEntity.numeroMedidorId);
                  }
                } catch (_error) {
                  console.warn(`No se encontró número de medidor: ${numeroStr}`);
                }
              }

              // Liberar números de medidor del técnico
              if (numerosMedidorIds.length > 0) {
                await this.numerosMedidorService.liberarDeTecnico(numerosMedidorIds);
              }
            }
          } catch (error) {
            console.error(
              `Error al liberar números de medidor para material ${material.materialId}:`,
              error,
            );
          }
        }
      }

      // 3. Eliminar o revertir inventarios técnicos
      // Buscar inventarios técnicos del usuario para los materiales de esta asignación
      try {
        for (const material of asignacion.materiales) {
          try {
            // Buscar inventario técnico para este usuario y material
            const inventariosTecnico = await this.inventarioTecnicoService.findByUsuario(
              asignacion.usuarioId,
            );
            const inventarioTecnicoItem = inventariosTecnico.find(
              (it) => it.materialId === material.materialId,
            );

            if (inventarioTecnicoItem) {
              const cantidadActual = Number(inventarioTecnicoItem.cantidad || 0);
              const cantidadAsignada = Number(material.cantidad || 0);

              // Si la cantidad actual es igual o mayor a la asignada, reducir o eliminar
              if (cantidadActual >= cantidadAsignada) {
                if (cantidadActual === cantidadAsignada) {
                  // Si es igual, eliminar el registro completo
                  await this.inventarioTecnicoService.remove(
                    inventarioTecnicoItem.inventarioTecnicoId,
                  );
                } else {
                  // Si es mayor, reducir la cantidad
                  await this.inventarioTecnicoService.update(
                    inventarioTecnicoItem.inventarioTecnicoId,
                    {
                      cantidad: cantidadActual - cantidadAsignada,
                    },
                  );
                }
              }
            }
          } catch (error) {
            console.error(
              `Error al revertir inventario técnico para material ${material.materialId}:`,
              error,
            );
          }
        }
      } catch (error) {
        console.error('Error al revertir inventarios técnicos:', error);
      }

      // 4. Revertir stock en la bodega de origen
      // Esto ya se hace automáticamente al eliminar los movimientos de salida
      // pero también podemos asegurarnos aquí
      try {
        const inventario = await this.inventariosService.findOne(asignacion.inventarioId);
        if (inventario) {
          const bodegaId = inventario.bodegaId || inventario.bodega?.bodegaId;
          if (bodegaId) {
            for (const material of asignacion.materiales) {
              try {
                // Sumar el stock de vuelta a la bodega de origen
                await this.materialesService.ajustarStock(
                  material.materialId,
                  Number(material.cantidad || 0),
                  bodegaId,
                );
              } catch (error) {
                console.error(
                  `Error al revertir stock para material ${material.materialId}:`,
                  error,
                );
              }
            }
          }
        }
      } catch (error) {
        console.error('Error al revertir stock en bodega de origen:', error);
      }
    } catch (error) {
      console.error('Error durante la reversión de la asignación:', error);
      // Continuar con la eliminación aunque haya errores en la reversión
    }

    // Registrar en auditoría antes de eliminar
    try {
      await this.auditoriaService.registrarEliminacion(
        TipoEntidad.ASIGNACION,
        asignacion.asignacionTecnicoId,
        datosEliminados,
        usuarioId,
        'Eliminación de asignación',
        `Asignación ${asignacion.asignacionCodigo} eliminada. Movimientos, números de medidor y stocks revertidos.`,
      );
    } catch (error) {
      console.error('Error al registrar en auditoría:', error);
      // Continuar con la eliminación aunque falle la auditoría
    }

    // Eliminar la asignación
    await this.asignacionesRepository.remove(asignacion);
  }
}
