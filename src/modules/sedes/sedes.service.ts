import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sede } from './sede.entity';
import { CreateSedeDto } from './dto/create-sede.dto';
import { UpdateSedeDto } from './dto/update-sede.dto';
import { HasRelatedEntitiesException } from '../../common/exceptions/business.exception';
import { GruposService } from '../grupos/grupos.service';
import { TipoGrupo } from '../grupos/grupo.entity';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';

@Injectable()
export class SedesService {
  constructor(
    @InjectRepository(Sede)
    private sedesRepository: Repository<Sede>,
    @Inject(forwardRef(() => GruposService))
    private gruposService: GruposService,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    private rolesService: RolesService,
  ) {}

  async create(createSedeDto: CreateSedeDto): Promise<Sede> {
    const sede = this.sedesRepository.create(createSedeDto);
    const savedSede = await this.sedesRepository.save(sede);
    
    // Crear grupo de chat automáticamente
    try {
      await this.gruposService.crearGrupoSede(savedSede.sedeId, savedSede.sedeNombre);
    } catch (error) {
      console.error(`[SedesService] ❌ Error al crear grupo de chat para sede ${savedSede.sedeNombre}:`, error);
      console.error(`[SedesService] Stack trace:`, error.stack);
      // No lanzar error para no interrumpir la creación de la sede
    }
    
    // Crear usuario admin automáticamente
    try {
      await this.crearUsuarioAdminSede(savedSede);
    } catch (error) {
      console.error(`[SedesService] ❌ Error al crear usuario admin para sede ${savedSede.sedeNombre}:`, error);
      console.error(`[SedesService] Stack trace:`, error.stack);
      // No lanzar error para no interrumpir la creación de la sede
    }
    
    return savedSede;
  }

  private async crearUsuarioAdminSede(sede: Sede): Promise<void> {
    try {
      // Normalizar el nombre para generar credenciales
      const nombreNormalizado = sede.sedeNombre
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
      let documento = `ADM-${sede.sedeId}-${Date.now()}`;
      while (await this.usersService.findByDocument(documento)) {
        documento = `ADM-${sede.sedeId}-${Date.now()}-${contador}`;
        contador++;
      }
      
      // Obtener el rol admin
      const rolAdmin = await this.rolesService.findByTipo('admin');
      if (!rolAdmin) {
        throw new Error('Rol admin no encontrado');
      }
      
      // Crear contraseña: admin + nombre de la sede (sin espacios, en minúsculas)
      // Formato: adminnombresede
      const password = `admin${nombreNormalizado}`;
      
      // Crear el usuario
      const nuevoUsuario = await this.usersService.create({
        usuarioRolId: rolAdmin.rolId,
        usuarioSede: sede.sedeId,
        usuarioNombre: 'Administrador',
        usuarioApellido: sede.sedeNombre,
        usuarioCorreo: email,
        usuarioDocumento: documento,
        usuarioContrasena: password,
      }, undefined);
      
      // Asegurar que el usuario esté activo
      if (!nuevoUsuario.usuarioEstado) {
        await this.usersService.updateEstado(nuevoUsuario.usuarioId, true);
      }
      
    } catch (error) {
      console.error(`[SedesService] Error al crear usuario admin para sede ${sede.sedeNombre}:`, error);
      throw error;
    }
  }

  async findAll(user?: any): Promise<Sede[]> {
    const allSedes = await this.sedesRepository.find({ relations: ['bodegas'] });
    
    // SuperAdmin ve todo
    if (user?.usuarioRol?.rolTipo === 'superadmin' || user?.role === 'superadmin') {
      return allSedes;
    }
    
    // Admin ve solo sedes de su departamento/oficina
    if (user?.usuarioRol?.rolTipo === 'admin' || user?.role === 'admin') {
      return allSedes.filter(sede => sede.departamentoId === user.usuarioSede);
    }
    
    // Administrador (Centro Operativo) - solo lectura, ve todas las sedes
    if (user?.usuarioRol?.rolTipo === 'administrador' || user?.role === 'administrador') {
      return allSedes;
    }
    
    return allSedes;
  }

  async findOne(id: number): Promise<Sede> {
    const sede = await this.sedesRepository.findOne({
      where: { sedeId: id },
      relations: ['bodegas', 'usuarios'],
    });
    if (!sede) {
      throw new NotFoundException(`Sede with ID ${id} not found`);
    }
    return sede;
  }

  async update(id: number, updateSedeDto: UpdateSedeDto): Promise<Sede> {
    const sede = await this.findOne(id);
    const estadoAnterior = sede.sedeEstado;
    Object.assign(sede, updateSedeDto);
    const sedeActualizada = await this.sedesRepository.save(sede);

    // Si la sede se desactiva, cerrar su chat
    if (estadoAnterior && !sedeActualizada.sedeEstado) {
      try {
        await this.gruposService.cerrarChat(
          TipoGrupo.SEDE,
          id,
          `Chat cerrado: La sede "${sedeActualizada.sedeNombre}" ha sido desactivada.`
        );
      } catch (error) {
        console.error(`[SedesService] Error al cerrar chat de sede ${id}:`, error);
      }
    }

    return sedeActualizada;
  }

  async remove(id: number): Promise<void> {
    const sede = await this.findOne(id);
    
    const relations: { [key: string]: number } = {};
    
    // Contar bodegas asociadas
    if (sede.bodegas && sede.bodegas.length > 0) {
      relations['bodegas'] = sede.bodegas.length;
    }
    
    // Contar usuarios asignados
    if (sede.usuarios && sede.usuarios.length > 0) {
      relations['usuarios'] = sede.usuarios.length;
    }
    
    // Si tiene relaciones, no se puede eliminar
    if (Object.keys(relations).length > 0) {
      throw new HasRelatedEntitiesException(`sede "${sede.sedeNombre}"`, relations);
    }
    
    await this.sedesRepository.remove(sede);
  }
}

