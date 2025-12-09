import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InstalacionMaterial } from './instalacion-material.entity';
import { CreateInstalacionMaterialDto, UpdateInstalacionMaterialDto, AssignMaterialesToInstalacionDto } from './dto/create-instalacion-material.dto';
import { InstalacionesService } from '../instalaciones/instalaciones.service';
import { InventarioTecnicoService } from '../inventario-tecnico/inventario-tecnico.service';

@Injectable()
export class InstalacionesMaterialesService {
  constructor(
    @InjectRepository(InstalacionMaterial)
    private instalacionMaterialRepository: Repository<InstalacionMaterial>,
    @Inject(forwardRef(() => InstalacionesService))
    private instalacionesService: InstalacionesService,
    @Inject(forwardRef(() => InventarioTecnicoService))
    private inventarioTecnicoService: InventarioTecnicoService,
  ) {}

  async create(createDto: CreateInstalacionMaterialDto): Promise<InstalacionMaterial> {
    const instalacionMaterial = this.instalacionMaterialRepository.create(createDto);
    const materialGuardado = await this.instalacionMaterialRepository.save(instalacionMaterial);
    
    // Descontar del inventario del técnico asignado cuando se agrega un material
    await this.descontarMaterialDelTecnico(createDto.instalacionId, createDto.materialId, createDto.cantidad);
    
    return materialGuardado;
  }

  async asignarMateriales(instalacionId: number, dto: AssignMaterialesToInstalacionDto): Promise<InstalacionMaterial[]> {
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
    return this.instalacionMaterialRepository.find({
      where: { instalacionId },
      relations: ['material', 'material.categoria', 'material.unidadMedida'],
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
    
    // Devolver el material al inventario del técnico cuando se elimina
    await this.devolverMaterialAlTecnico(instalacionId, materialId, cantidad);
    
    await this.instalacionMaterialRepository.remove(instalacionMaterial);
  }

  async removeByInstalacion(instalacionId: number): Promise<void> {
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
}

