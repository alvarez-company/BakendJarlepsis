import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bodega } from './bodega.entity';
import { CreateBodegaDto } from './dto/create-bodega.dto';
import { UpdateBodegaDto } from './dto/update-bodega.dto';
import { HasRelatedEntitiesException } from '../../common/exceptions/business.exception';
import { GruposService } from '../grupos/grupos.service';
import { TipoGrupo } from '../grupos/grupo.entity';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';

@Injectable()
export class BodegasService {
  constructor(
    @InjectRepository(Bodega)
    private bodegasRepository: Repository<Bodega>,
    @Inject(forwardRef(() => GruposService))
    private gruposService: GruposService,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    private rolesService: RolesService,
  ) {}

  async create(createBodegaDto: CreateBodegaDto): Promise<Bodega> {
    const bodega = this.bodegasRepository.create(createBodegaDto);
    const savedBodega = await this.bodegasRepository.save(bodega);
    
    // Crear grupo de chat automáticamente
    try {
      await this.gruposService.crearGrupoBodega(savedBodega.bodegaId, savedBodega.bodegaNombre);
    } catch (error) {
      console.error(`[BodegasService] ❌ Error al crear grupo de chat para bodega ${savedBodega.bodegaNombre}:`, error);
      console.error(`[BodegasService] Stack trace:`, error.stack);
      // No lanzar error para no interrumpir la creación de la bodega
    }
    
    // Crear usuario admin automáticamente
    try {
      await this.crearUsuarioAdminBodega(savedBodega);
    } catch (error) {
      console.error(`[BodegasService] ❌ Error al crear usuario admin para bodega ${savedBodega.bodegaNombre}:`, error);
      console.error(`[BodegasService] Stack trace:`, error.stack);
      // No lanzar error para no interrumpir la creación de la bodega
    }
    
    return savedBodega;
  }

  private async crearUsuarioAdminBodega(bodega: Bodega): Promise<void> {
    try {
      // Obtener la sede directamente desde la bodega
      const sedeId = bodega.sedeId;
      
      // Normalizar el nombre para generar credenciales
      const nombreNormalizado = bodega.bodegaNombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
      
      // Generar email único
      let email = `admin.${nombreNormalizado}@jarlepsis.local`;
      let contador = 1;
      while (await this.usersService.findByEmail(email)) {
        email = `admin.${nombreNormalizado}${contador}@jarlepsis.local`;
        contador++;
      }
      
      // Generar documento único
      let documento = `ADM-BD-${bodega.bodegaId}-${Date.now()}`;
      while (await this.usersService.findByDocument(documento)) {
        documento = `ADM-BD-${bodega.bodegaId}-${Date.now()}-${contador}`;
        contador++;
      }
      
      // Obtener el rol bodega
      const rolBodega = await this.rolesService.findByTipo('bodega');
      if (!rolBodega) {
        throw new Error('Rol bodega no encontrado');
      }
      
      // Crear contraseña: admin + nombre de la bodega (sin espacios, en minúsculas)
      // Formato: adminnombrebodega
      const password = `admin${nombreNormalizado}`;
      
      // Crear el usuario
      const nuevoUsuario = await this.usersService.create({
        usuarioRolId: rolBodega.rolId,
        usuarioSede: sedeId || undefined,
        usuarioBodega: bodega.bodegaId,
        usuarioNombre: 'Administrador',
        usuarioApellido: bodega.bodegaNombre,
        usuarioCorreo: email,
        usuarioDocumento: documento,
        usuarioContrasena: password,
      }, undefined);
      
      // Asegurar que el usuario esté activo
      if (!nuevoUsuario.usuarioEstado) {
        await this.usersService.updateEstado(nuevoUsuario.usuarioId, true);
      }
      
    } catch (error) {
      console.error(`[BodegasService] Error al crear usuario admin para bodega ${bodega.bodegaNombre}:`, error);
      throw error;
    }
  }

  async findAll(user?: any): Promise<Bodega[]> {
    const allBodegas = await this.bodegasRepository.find({ relations: ['sede'] });
    
    // SuperAdmin ve todo
    if (user?.usuarioRol?.rolTipo === 'superadmin' || user?.role === 'superadmin') {
      return allBodegas;
    }
    
    // Admin ve solo bodegas de su sede
    if (user?.usuarioRol?.rolTipo === 'admin' || user?.role === 'admin') {
      return allBodegas.filter(bodega => bodega.sedeId === user.usuarioSede);
    }
    
    // Usuario Bodega ve solo su bodega
    if (user?.usuarioRol?.rolTipo === 'bodega' || user?.role === 'bodega') {
      return allBodegas.filter(bodega => bodega.bodegaId === user.usuarioBodega);
    }
    
    // Bodega Internas - solo ve bodegas de tipo internas
    if (user?.usuarioRol?.rolTipo === 'bodega-internas' || user?.role === 'bodega-internas') {
      // Filtrar por tipo de bodega (necesitarías agregar un campo bodegaTipo a la entidad)
      // Por ahora, filtrar por sede si el usuario tiene una sede asignada
      if (user.usuarioSede) {
        return allBodegas.filter(bodega => bodega.sedeId === user.usuarioSede);
      }
      return allBodegas;
    }
    
    // Bodega Redes - solo ve bodegas de tipo redes
    if (user?.usuarioRol?.rolTipo === 'bodega-redes' || user?.role === 'bodega-redes') {
      // Filtrar por tipo de bodega (necesitarías agregar un campo bodegaTipo a la entidad)
      // Por ahora, filtrar por sede si el usuario tiene una sede asignada
      if (user.usuarioSede) {
        return allBodegas.filter(bodega => bodega.sedeId === user.usuarioSede);
      }
      return allBodegas;
    }
    
    return allBodegas;
  }

  async findOne(id: number): Promise<Bodega> {
    const bodega = await this.bodegasRepository.findOne({
      where: { bodegaId: id },
      relations: ['sede', 'usuarios'],
    });
    if (!bodega) {
      throw new NotFoundException(`Bodega with ID ${id} not found`);
    }
    return bodega;
  }

  async update(id: number, updateBodegaDto: UpdateBodegaDto): Promise<Bodega> {
    const bodega = await this.findOne(id);
    const estadoAnterior = bodega.bodegaEstado;
    Object.assign(bodega, updateBodegaDto);
    const bodegaActualizada = await this.bodegasRepository.save(bodega);

    // Si la bodega se desactiva, cerrar su chat
    if (estadoAnterior && !bodegaActualizada.bodegaEstado) {
      try {
        await this.gruposService.cerrarChat(
          TipoGrupo.BODEGA,
          id,
          `Chat cerrado: La bodega "${bodegaActualizada.bodegaNombre}" ha sido desactivada.`
        );
      } catch (error) {
        console.error(`[BodegasService] Error al cerrar chat de bodega ${id}:`, error);
      }
    }

    return bodegaActualizada;
  }

  async remove(id: number): Promise<void> {
    const bodega = await this.findOne(id);
    
    const relations: { [key: string]: number } = {};
    
    // Contar usuarios asignados
    if (bodega.usuarios && bodega.usuarios.length > 0) {
      relations['usuarios'] = bodega.usuarios.length;
    }
    
    // Si tiene relaciones, no se puede eliminar
    if (Object.keys(relations).length > 0) {
      throw new HasRelatedEntitiesException(`bodega "${bodega.bodegaNombre}"`, relations);
    }
    
    await this.bodegasRepository.remove(bodega);
  }
}

