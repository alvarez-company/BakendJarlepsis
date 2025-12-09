import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Oficina } from './oficina.entity';
import { CreateOficinaDto } from './dto/create-oficina.dto';
import { UpdateOficinaDto } from './dto/update-oficina.dto';
import { HasRelatedEntitiesException } from '../../common/exceptions/business.exception';
import { GruposService } from '../grupos/grupos.service';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';

@Injectable()
export class OficinasService {
  constructor(
    @InjectRepository(Oficina)
    private officesRepository: Repository<Oficina>,
    @Inject(forwardRef(() => GruposService))
    private gruposService: GruposService,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    private rolesService: RolesService,
  ) {}

  async create(createOficinaDto: CreateOficinaDto): Promise<Oficina> {
    const oficina = this.officesRepository.create(createOficinaDto);
    const savedOficina = await this.officesRepository.save(oficina);
    
    // Crear grupo de chat automáticamente
    try {
      await this.gruposService.crearGrupoOficina(savedOficina.oficinaId, savedOficina.oficinaNombre);
    } catch (error) {
      console.error(`[OficinasService] ❌ Error al crear grupo de chat para oficina ${savedOficina.oficinaNombre}:`, error);
      console.error(`[OficinasService] Stack trace:`, error.stack);
      // No lanzar error para no interrumpir la creación de la oficina
    }
    
    // Crear usuario admin automáticamente
    try {
      await this.crearUsuarioAdminOficina(savedOficina);
    } catch (error) {
      console.error(`[OficinasService] ❌ Error al crear usuario admin para oficina ${savedOficina.oficinaNombre}:`, error);
      console.error(`[OficinasService] Stack trace:`, error.stack);
      // No lanzar error para no interrumpir la creación de la oficina
    }
    
    return savedOficina;
  }

  private async crearUsuarioAdminOficina(oficina: Oficina): Promise<void> {
    try {
      // Normalizar el nombre para generar credenciales
      const nombreNormalizado = oficina.oficinaNombre
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
      let documento = `ADM-OF-${oficina.oficinaId}-${Date.now()}`;
      while (await this.usersService.findByDocument(documento)) {
        documento = `ADM-OF-${oficina.oficinaId}-${Date.now()}-${contador}`;
        contador++;
      }
      
      // Obtener el rol admin
      const rolAdmin = await this.rolesService.findByTipo('admin');
      if (!rolAdmin) {
        throw new Error('Rol admin no encontrado');
      }
      
      // Crear contraseña: admin + nombre de la oficina (sin espacios, en minúsculas)
      // Formato: adminnombreoficina
      const password = `admin${nombreNormalizado}`;
      
      // Crear el usuario
      const nuevoUsuario = await this.usersService.create({
        usuarioRolId: rolAdmin.rolId,
        usuarioSede: oficina.sedeId || undefined,
        // usuarioOficina eliminado - las bodegas ahora pertenecen directamente a sedes
        // usuarioOficina: oficina.oficinaId,
        usuarioNombre: 'Administrador',
        usuarioApellido: oficina.oficinaNombre,
        usuarioCorreo: email,
        usuarioDocumento: documento,
        usuarioContrasena: password,
      }, undefined);
      
      // Asegurar que el usuario esté activo
      if (!nuevoUsuario.usuarioEstado) {
        await this.usersService.updateEstado(nuevoUsuario.usuarioId, true);
      }
      
    } catch (error) {
      console.error(`[OficinasService] Error al crear usuario admin para oficina ${oficina.oficinaNombre}:`, error);
      throw error;
    }
  }

  async findAll(user?: any): Promise<Oficina[]> {
    const allOficinas = await this.officesRepository.find({ relations: ['sede', 'bodegas'] });
    
    // SuperAdmin ve todo
    if (user?.usuarioRol?.rolTipo === 'superadmin' || user?.role === 'superadmin') {
      return allOficinas;
    }
    
    // Admin ve solo su oficina y bodegas asociadas
    if (user?.usuarioRol?.rolTipo === 'admin' || user?.role === 'admin') {
      return allOficinas.filter(oficina => oficina.oficinaId === user.usuarioOficina);
    }
    
    return allOficinas;
  }

  async findOne(id: number): Promise<Oficina> {
    const oficina = await this.officesRepository.findOne({
      where: { oficinaId: id },
      relations: ['sede', 'bodegas', 'usuarios'],
    });
    if (!oficina) {
      throw new NotFoundException(`Oficina with ID ${id} not found`);
    }
    return oficina;
  }

  async update(id: number, updateOficinaDto: UpdateOficinaDto): Promise<Oficina> {
    const oficina = await this.findOne(id);
    Object.assign(oficina, updateOficinaDto);
    return this.officesRepository.save(oficina);
  }

  async remove(id: number): Promise<void> {
    const oficina = await this.findOne(id);
    
    const relations: { [key: string]: number } = {};
    
    // Bodegas y usuarios eliminados - las bodegas ahora pertenecen directamente a sedes
    // if (oficina.bodegas && oficina.bodegas.length > 0) {
    //   relations['bodegas'] = oficina.bodegas.length;
    // }
    
    // if (oficina.usuarios && oficina.usuarios.length > 0) {
    //   relations['usuarios'] = oficina.usuarios.length;
    // }
    
    // Si tiene relaciones, no se puede eliminar
    if (Object.keys(relations).length > 0) {
      throw new HasRelatedEntitiesException(`oficina "${oficina.oficinaNombre}"`, relations);
    }
    
    await this.officesRepository.remove(oficina);
  }
}

