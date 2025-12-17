import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InstalacionMaterial } from './instalacion-material.entity';
import { CreateInstalacionMaterialDto, UpdateInstalacionMaterialDto, AssignMaterialesToInstalacionDto } from './dto/create-instalacion-material.dto';
import { InstalacionesService } from '../instalaciones/instalaciones.service';
import { InventarioTecnicoService } from '../inventario-tecnico/inventario-tecnico.service';
import { NumerosMedidorService } from '../numeros-medidor/numeros-medidor.service';
import { MaterialesService } from '../materiales/materiales.service';

@Injectable()
export class InstalacionesMaterialesService {
  constructor(
    @InjectRepository(InstalacionMaterial)
    private instalacionMaterialRepository: Repository<InstalacionMaterial>,
    @Inject(forwardRef(() => InstalacionesService))
    private instalacionesService: InstalacionesService,
    @Inject(forwardRef(() => InventarioTecnicoService))
    private inventarioTecnicoService: InventarioTecnicoService,
    @Inject(forwardRef(() => NumerosMedidorService))
    private numerosMedidorService: NumerosMedidorService,
    @Inject(forwardRef(() => MaterialesService))
    private materialesService: MaterialesService,
  ) {}

  async create(createDto: CreateInstalacionMaterialDto): Promise<InstalacionMaterial> {
    // Validar que solo se permita un medidor por instalación
    const material = await this.materialesService.findOne(createDto.materialId);
    const esMedidor = Boolean(material?.materialEsMedidor);
    
    if (esMedidor) {
      // Verificar si ya existe un medidor en esta instalación
      const materialesExistentes = await this.instalacionMaterialRepository.find({
        where: { instalacionId: createDto.instalacionId },
        relations: ['material'],
      });
      
      const tieneMedidor = materialesExistentes.some(
        (mat) => mat.material && Boolean(mat.material.materialEsMedidor)
      );
      
      if (tieneMedidor) {
        throw new BadRequestException(
          'Solo se puede asignar un medidor por instalación. Ya existe un medidor asignado a esta instalación.'
        );
      }
      
      // Validar que la cantidad sea exactamente 1
      if (Number(createDto.cantidad) !== 1) {
        throw new BadRequestException(
          'Para medidores, la cantidad debe ser exactamente 1. Solo se puede asignar un medidor por instalación.'
        );
      }
    }
    
    const instalacionMaterial = this.instalacionMaterialRepository.create(createDto);
    const materialGuardado = await this.instalacionMaterialRepository.save(instalacionMaterial);
    
    // Descontar del inventario del técnico asignado cuando se agrega un material
    // Esto se hace inmediatamente cuando el técnico registra el material desde la app móvil
    await this.descontarMaterialDelTecnico(createDto.instalacionId, createDto.materialId, createDto.cantidad);
    
    // Manejar números de medidor si el material es de categoría "medidor"
    try {
      // Si se proporcionaron números de medidor específicos, usarlos (el servicio marcará automáticamente el material como medidor)
      if (createDto.numerosMedidor && createDto.numerosMedidor.length > 0 && createDto.cantidad > 0) {
          const numerosMedidorIds: number[] = [];
          
          for (const numeroMedidor of createDto.numerosMedidor) {
            // Asegurar que el número de medidor se guarde correctamente sin modificaciones
            const numeroMedidorParaGuardar = numeroMedidor?.trim() || numeroMedidor;
            
            // Buscar si ya existe este número de medidor
            let numeroMedidorEntity = await this.numerosMedidorService.findByNumero(numeroMedidorParaGuardar);
            
            if (!numeroMedidorEntity) {
              // Crear nuevo número de medidor si no existe
              numeroMedidorEntity = await this.numerosMedidorService.create({
                materialId: createDto.materialId,
                numeroMedidor: numeroMedidorParaGuardar,
                estado: 'en_instalacion' as any,
                instalacionId: createDto.instalacionId,
                instalacionMaterialId: materialGuardado.instalacionMaterialId,
              });
            } else {
              // Actualizar número de medidor existente
              // Preservar usuarioId e inventarioTecnicoId si existen para mantener trazabilidad
              const updateData: any = {
                estado: 'en_instalacion' as any,
                instalacionId: createDto.instalacionId,
                instalacionMaterialId: materialGuardado.instalacionMaterialId,
              };
              
              // Solo limpiar usuarioId e inventarioTecnicoId si no existían previamente
              // Esto mantiene la trazabilidad de dónde vino el número
              if (!numeroMedidorEntity.usuarioId && !numeroMedidorEntity.inventarioTecnicoId) {
                updateData.usuarioId = null;
                updateData.inventarioTecnicoId = null;
              }
              
              numeroMedidorEntity = await this.numerosMedidorService.update(numeroMedidorEntity.numeroMedidorId, updateData);
            }
            
            numerosMedidorIds.push(numeroMedidorEntity.numeroMedidorId);
          }
        } else {
          // Si no se proporcionaron números, obtener números asignados al técnico automáticamente
          const instalacion = await this.instalacionesService.findOne(createDto.instalacionId);
          if (instalacion && instalacion.usuariosAsignados) {
            const tecnicoAsignado = instalacion.usuariosAsignados.find((u: any) => {
              const usuario = u.usuario || u;
              return usuario && (usuario.usuarioRol?.rolTipo === 'tecnico' || usuario.rolTipo === 'tecnico');
            });
            
            if (tecnicoAsignado) {
              const usuario = tecnicoAsignado.usuario || tecnicoAsignado;
              const tecnicoId = usuario.usuarioId;
              
              // Obtener números de medidor asignados al técnico para este material
              const numerosMedidorTecnico = await this.numerosMedidorService.findByUsuario(tecnicoId);
              const numerosDelMaterial = numerosMedidorTecnico.filter(
                n => n.materialId === createDto.materialId && n.estado === 'asignado_tecnico'
              );
              
              // Asignar los primeros números disponibles a la instalación
              const cantidadNumerica = Math.round(Number(createDto.cantidad || 0));
              const numerosAAsignar = numerosDelMaterial.slice(0, cantidadNumerica);
              
              if (numerosAAsignar.length > 0) {
                await this.numerosMedidorService.asignarAInstalacion(
                  numerosAAsignar.map(n => n.numeroMedidorId),
                  createDto.instalacionId,
                  materialGuardado.instalacionMaterialId
                );
              }
            }
          }
        }
    } catch (error) {
      console.error(`Error al manejar números de medidor en instalación:`, error);
      // No lanzar error para no interrumpir la creación del material
    }
    
    return materialGuardado;
  }

  async asignarMateriales(instalacionId: number, dto: AssignMaterialesToInstalacionDto): Promise<InstalacionMaterial[]> {
    // Validar que solo se permita un medidor por instalación
    const materialesMedidor = [];
    for (const materialDto of dto.materiales) {
      const material = await this.materialesService.findOne(materialDto.materialId);
      if (material && Boolean(material.materialEsMedidor)) {
        materialesMedidor.push(materialDto);
        
        // Validar que la cantidad sea exactamente 1
        if (Number(materialDto.cantidad) !== 1) {
          throw new BadRequestException(
            `Para medidores, la cantidad debe ser exactamente 1. El material "${material.materialNombre}" tiene cantidad ${materialDto.cantidad}.`
          );
        }
      }
    }
    
    if (materialesMedidor.length > 1) {
      throw new BadRequestException(
        'Solo se puede asignar un medidor por instalación. Se intentó asignar más de un medidor.'
      );
    }
    
    // Eliminar materiales existentes de esta instalación
    await this.instalacionMaterialRepository.delete({ instalacionId });

    // Crear nuevos registros
    const materiales: InstalacionMaterial[] = [];
    for (const material of dto.materiales) {
      const nuevo = this.instalacionMaterialRepository.create({
        instalacionId,
        materialId: material.materialId,
        cantidad: material.cantidad,
        observaciones: material.observaciones,
      });
      materiales.push(await this.instalacionMaterialRepository.save(nuevo));
    }

    return materiales;
  }

  async findAll(): Promise<InstalacionMaterial[]> {
    // No cargar la relación instalacion para evitar que TypeORM intente cargar cliente automáticamente
    return this.instalacionMaterialRepository.find({
      relations: ['material'],
    });
  }

  async findByInstalacion(instalacionId: number): Promise<InstalacionMaterial[]> {
    const materiales = await this.instalacionMaterialRepository.find({
      where: { instalacionId },
      relations: ['material', 'material.categoria', 'material.unidadMedida', 'numerosMedidor'],
    });
    
    // Obtener todos los números de medidor de la instalación para asegurar que se incluyan todos
    const todosNumerosMedidor = await this.numerosMedidorService.findByInstalacion(instalacionId);
    
    // Transformar los números de medidor a un array de strings para facilitar el uso en el frontend
    return materiales.map(material => {
      // Primero intentar obtener de la relación cargada
      let numerosMedidorStrings: string[] = [];
      
      if (material.numerosMedidor && Array.isArray(material.numerosMedidor)) {
        // Filtrar por instalacionMaterialId para asegurar que solo se incluyan los números de este material
        const numerosFiltrados = material.numerosMedidor.filter((num: any) => {
          return num.instalacionMaterialId === material.instalacionMaterialId;
        });
        
        numerosMedidorStrings = numerosFiltrados.map((num: any) => {
          // Asegurar que se obtenga el número correcto
          return (num.numeroMedidor || (typeof num === 'string' ? num : '')).trim();
        }).filter((num: string) => num && num !== '');
      }
      
      // Si no se encontraron números en la relación, buscar en todosNumerosMedidor
      if (numerosMedidorStrings.length === 0) {
        const numerosDelMaterial = todosNumerosMedidor.filter(
          n => n.instalacionMaterialId === material.instalacionMaterialId
        );
        
        if (numerosDelMaterial.length > 0) {
          numerosMedidorStrings = numerosDelMaterial
            .map(n => (n.numeroMedidor || '').trim())
            .filter(n => n && n !== '');
        }
      }
      
      return {
        ...material,
        numerosMedidor: numerosMedidorStrings,
      };
    });
  }

  async findByMaterial(materialId: number): Promise<InstalacionMaterial[]> {
    // No cargar la relación instalacion para evitar que TypeORM intente cargar cliente automáticamente
    return this.instalacionMaterialRepository.find({
      where: { materialId },
    });
  }

  async findOne(id: number): Promise<InstalacionMaterial> {
    // No cargar la relación instalacion para evitar que TypeORM intente cargar cliente automáticamente
    const instalacionMaterial = await this.instalacionMaterialRepository.findOne({
      where: { instalacionMaterialId: id },
      relations: ['material'],
    });

    if (!instalacionMaterial) {
      throw new NotFoundException(`Material de instalación con ID ${id} no encontrado`);
    }

    return instalacionMaterial;
  }

  async update(id: number, updateDto: UpdateInstalacionMaterialDto): Promise<InstalacionMaterial> {
    const instalacionMaterial = await this.findOne(id);
    const cantidadAnterior = Number(instalacionMaterial.cantidad || 0);
    const cantidadNueva = updateDto.cantidad !== undefined ? Number(updateDto.cantidad) : cantidadAnterior;
    const diferencia = cantidadNueva - cantidadAnterior;
    
    // Actualizar el registro
    Object.assign(instalacionMaterial, updateDto);
    const materialActualizado = await this.instalacionMaterialRepository.save(instalacionMaterial);
    
    // Manejar números de medidor si el material es de categoría "medidor" y la cantidad cambió
    try {
      const material = await this.materialesService.findOne(instalacionMaterial.materialId);
      const esMedidor = await this.esMaterialMedidor(material);
      
      if (esMedidor && diferencia !== 0 && instalacionMaterial.instalacionId) {
        const instalacion = await this.instalacionesService.findOne(instalacionMaterial.instalacionId);
        
        if (instalacion && instalacion.usuariosAsignados) {
          const tecnicoAsignado = instalacion.usuariosAsignados.find((u: any) => {
            const usuario = u.usuario || u;
            return usuario && (usuario.usuarioRol?.rolTipo === 'tecnico' || usuario.rolTipo === 'tecnico');
          });
          
          if (tecnicoAsignado) {
            const usuario = tecnicoAsignado.usuario || tecnicoAsignado;
            const tecnicoId = usuario.usuarioId;
            
            // Obtener números de medidor actuales asignados a esta instalación para este material
            const numerosMedidorInstalacion = await this.numerosMedidorService.findByInstalacion(instalacionMaterial.instalacionId);
            const numerosDelMaterial = numerosMedidorInstalacion.filter(
              n => n.materialId === instalacionMaterial.materialId && 
                   n.instalacionMaterialId === instalacionMaterial.instalacionMaterialId &&
                   (n.estado === 'en_instalacion' || n.estado === 'instalado')
            );
            
            const cantidadNumericaNueva = Math.round(cantidadNueva);
            const cantidadNumericaAnterior = Math.round(cantidadAnterior);
            
            if (diferencia > 0) {
              // Si aumentó la cantidad, asignar más números de medidor del técnico
              const numerosNecesarios = cantidadNumericaNueva - cantidadNumericaAnterior;
              const numerosMedidorTecnico = await this.numerosMedidorService.findByUsuario(tecnicoId);
              const numerosDisponiblesTecnico = numerosMedidorTecnico.filter(
                n => n.materialId === instalacionMaterial.materialId && n.estado === 'asignado_tecnico'
              );
              
              const numerosAAsignar = numerosDisponiblesTecnico.slice(0, numerosNecesarios);
              if (numerosAAsignar.length > 0) {
                await this.numerosMedidorService.asignarAInstalacion(
                  numerosAAsignar.map(n => n.numeroMedidorId),
                  instalacionMaterial.instalacionId,
                  instalacionMaterial.instalacionMaterialId
                );
              }
            } else if (diferencia < 0) {
              // Si disminuyó la cantidad, liberar números de medidor (volver al técnico)
              const numerosALiberar = Math.abs(diferencia);
              const numerosParaLiberar = numerosDelMaterial.slice(0, numerosALiberar);
              
              if (numerosParaLiberar.length > 0) {
                // Obtener inventario técnico para este material
                const inventarioTecnico = await this.inventarioTecnicoService.findByUsuario(tecnicoId);
                const inventarioItem = inventarioTecnico.find(
                  (inv) => inv.materialId === instalacionMaterial.materialId && inv.usuarioId === tecnicoId
                );
                
                if (inventarioItem) {
                  // Liberar de instalación y volver a asignar al técnico
                  for (const numero of numerosParaLiberar) {
                    await this.numerosMedidorService.update(numero.numeroMedidorId, {
                      estado: 'asignado_tecnico' as any,
                      instalacionId: null,
                      instalacionMaterialId: null,
                      usuarioId: tecnicoId,
                      inventarioTecnicoId: inventarioItem.inventarioTecnicoId,
                    });
                  }
                } else {
                  // Si no hay inventario técnico, liberar completamente
                  await this.numerosMedidorService.liberarDeInstalacion(
                    numerosParaLiberar.map(n => n.numeroMedidorId)
                  );
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error al manejar números de medidor al actualizar material de instalación:`, error);
      // No lanzar error para no interrumpir la actualización
    }
    
    // Si la cantidad cambió y hay diferencia, ajustar inventario del técnico asignado
    if (diferencia !== 0 && instalacionMaterial.instalacionId) {
      try {
        // Obtener la instalación para encontrar el técnico asignado
        const instalacion = await this.instalacionesService.findOne(instalacionMaterial.instalacionId);
        
        if (instalacion && instalacion.usuariosAsignados && Array.isArray(instalacion.usuariosAsignados)) {
          // Buscar el técnico asignado
          const tecnicoAsignado = instalacion.usuariosAsignados.find((u: any) => {
            const usuario = u.usuario || u;
            return usuario && (usuario.usuarioRol?.rolTipo === 'tecnico' || usuario.rolTipo === 'tecnico');
          });
          
          if (tecnicoAsignado) {
            const usuario = tecnicoAsignado.usuario || tecnicoAsignado;
            const tecnicoId = usuario.usuarioId;
            
            // Obtener el inventario del técnico para este material
            const inventarioTecnico = await this.inventarioTecnicoService.findByUsuario(tecnicoId);
            const inventarioItem = inventarioTecnico.find(
              (inv) => inv.materialId === instalacionMaterial.materialId && inv.usuarioId === tecnicoId
            );
            
            if (inventarioItem) {
              // Si la cantidad aumentó, restar del inventario del técnico
              // Si la cantidad disminuyó, agregar al inventario del técnico
              const cantidadActual = Number(inventarioItem.cantidad || 0);
              const nuevaCantidad = Math.max(0, cantidadActual - diferencia);
              
              await this.inventarioTecnicoService.update(inventarioItem.inventarioTecnicoId, {
                cantidad: nuevaCantidad,
              });
            }
          }
        }
      } catch (error) {
        console.error(`[InstalacionesMaterialesService] Error al ajustar inventario técnico:`, error);
        // No lanzar error para no interrumpir la actualización del material
      }
    }
    
    return materialActualizado;
  }

  async remove(id: number): Promise<void> {
    const instalacionMaterial = await this.findOne(id);
    const instalacionId = instalacionMaterial.instalacionId;
    const materialId = instalacionMaterial.materialId;
    const cantidad = instalacionMaterial.cantidad;
    
    // Liberar números de medidor asignados a esta instalación
    try {
      const numerosMedidorInstalacion = await this.numerosMedidorService.findByInstalacion(instalacionId);
      const numerosDelMaterial = numerosMedidorInstalacion.filter(
        n => n.materialId === materialId && n.instalacionMaterialId === instalacionMaterial.instalacionMaterialId
      );
      
      if (numerosDelMaterial.length > 0) {
        // Liberar de instalación primero (esto devolverá al técnico si venían del técnico, o a disponible)
        await this.numerosMedidorService.liberarDeInstalacion(
          numerosDelMaterial.map(n => n.numeroMedidorId)
        );
      }
    } catch (error) {
      console.error(`Error al liberar números de medidor al eliminar material de instalación:`, error);
      // Continuar con la eliminación aunque falle la liberación
    }
    
    // Devolver el material al inventario del técnico cuando se elimina
    await this.devolverMaterialAlTecnico(instalacionId, materialId, cantidad);
    
    await this.instalacionMaterialRepository.remove(instalacionMaterial);
  }

  async removeByInstalacion(instalacionId: number): Promise<void> {
    // Obtener todos los materiales de la instalación antes de eliminarlos
    const materiales = await this.instalacionMaterialRepository.find({
      where: { instalacionId },
    });
    
    // Liberar números de medidor de todos los materiales
    for (const material of materiales) {
      try {
        const numerosMedidorInstalacion = await this.numerosMedidorService.findByInstalacion(instalacionId);
        const numerosDelMaterial = numerosMedidorInstalacion.filter(
          n => n.materialId === material.materialId && n.instalacionMaterialId === material.instalacionMaterialId
        );
        
        if (numerosDelMaterial.length > 0) {
          await this.numerosMedidorService.liberarDeInstalacion(
            numerosDelMaterial.map(n => n.numeroMedidorId)
          );
        }
      } catch (error) {
        console.error(`Error al liberar números de medidor al eliminar material ${material.instalacionMaterialId}:`, error);
        // Continuar con la eliminación aunque falle la liberación
      }
      
      // Devolver el material al inventario del técnico
      try {
        await this.devolverMaterialAlTecnico(instalacionId, material.materialId, material.cantidad);
      } catch (error) {
        console.error(`Error al devolver material ${material.materialId} al técnico:`, error);
        // Continuar con la eliminación aunque falle la devolución
      }
    }
    
    // Eliminar todos los materiales de la instalación
    await this.instalacionMaterialRepository.delete({ instalacionId });
  }

  async aprobarMaterial(id: number, aprobado: boolean): Promise<InstalacionMaterial> {
    const instalacionMaterial = await this.findOne(id);
    instalacionMaterial.materialAprobado = aprobado;
    return this.instalacionMaterialRepository.save(instalacionMaterial);
  }

  /**
   * Descontar material del inventario del técnico asignado a una instalación
   */
  private async descontarMaterialDelTecnico(
    instalacionId: number,
    materialId: number,
    cantidad: number
  ): Promise<void> {
    try {
      // Obtener la instalación para encontrar el técnico asignado
      const instalacion = await this.instalacionesService.findOne(instalacionId);
      
      if (!instalacion || !instalacion.usuariosAsignados || !Array.isArray(instalacion.usuariosAsignados)) {
        return;
      }
      
      // Buscar el técnico asignado
      const tecnicoAsignado = instalacion.usuariosAsignados.find((u: any) => {
        const usuario = u.usuario || u;
        return usuario && (usuario.usuarioRol?.rolTipo === 'tecnico' || usuario.rolTipo === 'tecnico');
      });
      
      if (!tecnicoAsignado) {
        return;
      }
      
      const usuario = tecnicoAsignado.usuario || tecnicoAsignado;
      const tecnicoId = usuario.usuarioId;
      const cantidadNumerica = Math.round(Number(cantidad || 0));
      
      if (cantidadNumerica <= 0) {
        return;
      }
      
      // Obtener el inventario del técnico para este material
      const inventarioTecnico = await this.inventarioTecnicoService.findByUsuario(tecnicoId);
      const inventarioItem = inventarioTecnico.find(
        (inv) => inv.materialId === materialId && inv.usuarioId === tecnicoId
      );
      
      if (inventarioItem) {
        const cantidadActual = Number(inventarioItem.cantidad || 0);
        const nuevaCantidad = Math.max(0, cantidadActual - cantidadNumerica);
        
        await this.inventarioTecnicoService.update(inventarioItem.inventarioTecnicoId, {
          cantidad: nuevaCantidad,
        });
      }
    } catch (error) {
      console.error(`[InstalacionesMaterialesService] Error al descontar material del técnico:`, error);
      // No lanzar error para no interrumpir la creación del material
    }
  }

  /**
   * Devolver material al inventario del técnico cuando se elimina de una instalación
   */
  private async devolverMaterialAlTecnico(
    instalacionId: number,
    materialId: number,
    cantidad: number
  ): Promise<void> {
    try {
      // Obtener la instalación para encontrar el técnico asignado
      const instalacion = await this.instalacionesService.findOne(instalacionId);
      
      if (!instalacion || !instalacion.usuariosAsignados || !Array.isArray(instalacion.usuariosAsignados)) {
        return;
      }
      
      // Buscar el técnico asignado
      const tecnicoAsignado = instalacion.usuariosAsignados.find((u: any) => {
        const usuario = u.usuario || u;
        return usuario && (usuario.usuarioRol?.rolTipo === 'tecnico' || usuario.rolTipo === 'tecnico');
      });
      
      if (!tecnicoAsignado) {
        return;
      }
      
      const usuario = tecnicoAsignado.usuario || tecnicoAsignado;
      const tecnicoId = usuario.usuarioId;
      const cantidadNumerica = Math.round(Number(cantidad || 0));
      
      if (cantidadNumerica <= 0) {
        return;
      }
      
      // Obtener el inventario del técnico para este material
      const inventarioTecnico = await this.inventarioTecnicoService.findByUsuario(tecnicoId);
      const inventarioItem = inventarioTecnico.find(
        (inv) => inv.materialId === materialId && inv.usuarioId === tecnicoId
      );
      
      if (inventarioItem) {
        const cantidadActual = Number(inventarioItem.cantidad || 0);
        const nuevaCantidad = cantidadActual + cantidadNumerica;
        
        await this.inventarioTecnicoService.update(inventarioItem.inventarioTecnicoId, {
          cantidad: nuevaCantidad,
        });
      } else {
        // Si no existe el registro en el inventario, crearlo
        await this.inventarioTecnicoService.create({
          usuarioId: tecnicoId,
          materialId: materialId,
          cantidad: cantidadNumerica,
        });
      }
    } catch (error) {
      console.error(`[InstalacionesMaterialesService] Error al devolver material al técnico:`, error);
      // No lanzar error para no interrumpir la eliminación del material
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

