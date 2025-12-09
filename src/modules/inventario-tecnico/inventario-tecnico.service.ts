import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventarioTecnico } from './inventario-tecnico.entity';
import { CreateInventarioTecnicoDto, UpdateInventarioTecnicoDto, AssignMaterialesToTecnicoDto } from './dto/create-inventario-tecnico.dto';
import { MovimientosService } from '../movimientos/movimientos.service';
import { TipoMovimiento, EstadoMovimiento } from '../movimientos/movimiento-inventario.entity';
import { InventariosService } from '../inventarios/inventarios.service';
import { AsignacionesTecnicosService } from '../asignaciones-tecnicos/asignaciones-tecnicos.service';
import { MaterialesService } from '../materiales/materiales.service';

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

  async asignarMateriales(usuarioId: number, dto: AssignMaterialesToTecnicoDto): Promise<InventarioTecnico[]> {
    const resultados: InventarioTecnico[] = [];

    // Si hay inventarioId, crear movimientos de salida automáticamente
    // Usar usuarioAsignadorId si está disponible, sino usar el usuarioId del técnico
    const usuarioAsignador = dto.usuarioAsignadorId || usuarioId;
    
    // El código se generará automáticamente en el servicio de asignaciones
    let asignacionCodigo: string | undefined = undefined;
    
    if (dto.inventarioId) {
      try {
        const inventario = await this.inventariosService.findOne(dto.inventarioId);
        const bodegaId = inventario.bodegaId ?? inventario.bodega?.bodegaId;
        
        if (bodegaId) {
          const salidaCodigo = `SALIDA-TECNICO-${usuarioId}-${Date.now()}`;
          
          // Crear movimiento de salida para cada material
          for (const material of dto.materiales) {
            try {
              // Crear el movimiento de salida
              const movimientosCreados = await this.movimientosService.create({
                movimientoTipo: TipoMovimiento.SALIDA,
                materiales: [{
                  materialId: material.materialId,
                  movimientoCantidad: material.cantidad,
                }],
                inventarioId: dto.inventarioId,
                usuarioId: usuarioAsignador,
                movimientoObservaciones: dto.observaciones || `Asignación de material a técnico ${usuarioId}`,
                movimientoCodigo: salidaCodigo,
              });

              // Completar automáticamente el movimiento para que se reste el stock
              if (movimientosCreados && movimientosCreados.length > 0) {
                for (const movimiento of movimientosCreados) {
                  if (movimiento.movimientoEstado !== EstadoMovimiento.COMPLETADA) {
                    await this.movimientosService.actualizarEstado(movimiento.movimientoId, EstadoMovimiento.COMPLETADA);
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

    // Crear registro de asignación completa (un registro por cada asignación realizada)
    // El código se generará automáticamente si no se proporciona
    if (dto.inventarioId && usuarioAsignador) {
      try {
        await this.asignacionesTecnicosService.create({
          asignacionCodigo: asignacionCodigo, // undefined = se generará automáticamente
          usuarioId,
          inventarioId: dto.inventarioId,
          usuarioAsignadorId: usuarioAsignador,
          materiales: dto.materiales.map(m => ({
            materialId: m.materialId,
            cantidad: Number(m.cantidad || 0),
          })),
          observaciones: dto.observaciones,
        });
      } catch (error) {
        console.error('Error al crear registro de asignación:', error);
        // No lanzar error aquí para no interrumpir el proceso, pero registrar el error
      }
    }

    // Asignar materiales al técnico - Actualizar stock si existe, crear si no existe
    const materialesIds = new Set<number>();
    for (const material of dto.materiales) {
      const cantidadAsignada = Number(material.cantidad || 0);
      materialesIds.add(material.materialId);
      
      // Verificar si ya existe un registro para este técnico y material
      const existente = await this.inventarioTecnicoRepository.findOne({
        where: {
          usuarioId,
          materialId: material.materialId,
        },
      });

      if (existente) {
        // Si existe, actualizar la cantidad sumando la nueva cantidad asignada
        const cantidadActual = Number(existente.cantidad || 0);
        existente.cantidad = cantidadActual + cantidadAsignada;
        resultados.push(await this.inventarioTecnicoRepository.save(existente));
      } else {
        // Si no existe, crear un nuevo registro
        const nuevo = this.inventarioTecnicoRepository.create({
          usuarioId,
          materialId: material.materialId,
          cantidad: cantidadAsignada,
        });
        resultados.push(await this.inventarioTecnicoRepository.save(nuevo));
      }
    }

    // IMPORTANTE: Sincronizar el stock total de cada material después de asignar
    for (const materialId of materialesIds) {
      try {
        await this.materialesService.sincronizarStock(materialId);
      } catch (error) {
        console.error(`Error al sincronizar stock del material ${materialId} después de asignar a técnico:`, error);
        // No lanzar error para no interrumpir el proceso
      }
    }

    return resultados;
  }

  async findAll(): Promise<InventarioTecnico[]> {
    return this.inventarioTecnicoRepository.find({
      relations: ['usuario', 'material'],
    });
  }

  async findByUsuario(usuarioId: number): Promise<InventarioTecnico[]> {
    const inventarios = await this.inventarioTecnicoRepository.find({
      where: { usuarioId },
      relations: ['material', 'material.categoria', 'material.unidadMedida'],
    });
    
    // Agrupar por materialId y sumar cantidades para evitar duplicados
    const materialesAgrupados = new Map<number, InventarioTecnico>();
    
    inventarios.forEach((item) => {
      const materialId = item.materialId;
      const cantidad = Number(item.cantidad || 0);
      
      if (materialesAgrupados.has(materialId)) {
        // Si ya existe, sumar la cantidad
        const existente = materialesAgrupados.get(materialId)!;
        existente.cantidad = Number(existente.cantidad || 0) + cantidad;
      } else {
        // Si no existe, agregarlo
        materialesAgrupados.set(materialId, { ...item, cantidad });
      }
    });
    
    // Convertir el Map a un array y devolverlo
    return Array.from(materialesAgrupados.values());
  }

  async findByMaterial(materialId: number): Promise<InventarioTecnico[]> {
    return this.inventarioTecnicoRepository.find({
      where: { materialId },
      relations: ['usuario'],
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
      console.error(`Error al sincronizar stock del material ${materialId} después de actualizar inventario técnico:`, error);
      // No lanzar error para no interrumpir el proceso
    }
    
    return resultado;
  }

  async remove(id: number): Promise<void> {
    const inventario = await this.findOne(id);
    const materialId = inventario.materialId;
    await this.inventarioTecnicoRepository.remove(inventario);
    
    // IMPORTANTE: Sincronizar el stock total del material después de eliminar
    try {
      await this.materialesService.sincronizarStock(materialId);
    } catch (error) {
      console.error(`Error al sincronizar stock del material ${materialId} después de eliminar inventario técnico:`, error);
      // No lanzar error para no interrumpir el proceso
    }
  }

  async removeByUsuarioAndMaterial(usuarioId: number, materialId: number): Promise<void> {
    const inventario = await this.inventarioTecnicoRepository.findOne({
      where: { usuarioId, materialId },
    });

    if (inventario) {
      await this.inventarioTecnicoRepository.remove(inventario);
    }
  }
}

