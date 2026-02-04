import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
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

  /**
   * Obtiene o crea la única bodega de instalaciones por centro operativo (sede).
   * Es una sola bodega por sede, compartida por todas las instalaciones que queden en estado NOVEDAD.
   * Se usa cuando alguna instalación pasa a "novedad" para tener la estructura de bodega/inventario.
   * No se crean movimientos (entradas) aquí: el stock no debe verse afectado; los materiales ya fueron
   * descontados del técnico. Para saber dónde están los materiales, consultar instalaciones_materiales
   * de las instalaciones con estado NOVEDAD.
   */
  async findOrCreateBodegaInstalaciones(sedeId: number): Promise<Bodega> {
    const existing = await this.bodegasRepository.findOne({
      where: { sedeId, bodegaTipo: 'instalaciones' },
    });
    if (existing) return existing;
    const bodega = this.bodegasRepository.create({
      bodegaNombre: 'Bodega de instalaciones',
      bodegaDescripcion: 'Materiales de instalaciones con novedad técnica',
      bodegaTipo: 'instalaciones',
      sedeId,
      bodegaEstado: true,
    });
    return this.bodegasRepository.save(bodega);
  }

  async create(createBodegaDto: CreateBodegaDto, user?: any): Promise<Bodega> {
    const tipo = (createBodegaDto.bodegaTipo || '').toLowerCase();
    if (tipo !== 'internas' && tipo !== 'redes') {
      throw new BadRequestException(
        'Al crear una bodega debe seleccionar el tipo: internas o redes.',
      );
    }
    if (user) {
      const rolTipo = user.usuarioRol?.rolTipo || user.role;
      const sedeId = user.usuarioSede ?? user.sede?.sedeId;
      if (rolTipo === 'admin') {
        if (sedeId == null) {
          throw new BadRequestException(
            'Tu usuario no tiene centro operativo asignado. No puedes crear bodegas.',
          );
        }
        if (createBodegaDto.sedeId !== sedeId) {
          throw new BadRequestException('Solo puedes crear bodegas en tu centro operativo.');
        }
      } else if (rolTipo === 'admin-internas') {
        if (tipo !== 'internas') {
          throw new BadRequestException('Solo puedes crear bodegas de tipo internas.');
        }
        if (createBodegaDto.sedeId !== user.usuarioSede) {
          throw new BadRequestException('Solo puedes crear bodegas en tu centro operativo.');
        }
      } else if (rolTipo === 'admin-redes') {
        if (tipo !== 'redes') {
          throw new BadRequestException('Solo puedes crear bodegas de tipo redes.');
        }
        if (createBodegaDto.sedeId !== user.usuarioSede) {
          throw new BadRequestException('Solo puedes crear bodegas en tu centro operativo.');
        }
      }
    }
    const bodega = this.bodegasRepository.create(createBodegaDto);
    const savedBodega = await this.bodegasRepository.save(bodega);

    // Crear grupo de chat automáticamente
    try {
      await this.gruposService.crearGrupoBodega(savedBodega.bodegaId, savedBodega.bodegaNombre);
    } catch (error) {
      console.error(
        `[BodegasService] ❌ Error al crear grupo de chat para bodega ${savedBodega.bodegaNombre}:`,
        error,
      );
      console.error(`[BodegasService] Stack trace:`, error.stack);
      // No lanzar error para no interrumpir la creación de la bodega
    }

    // Crear usuario admin automáticamente
    try {
      await this.crearUsuarioAdminBodega(savedBodega);
    } catch (error) {
      console.error(
        `[BodegasService] ❌ Error al crear usuario admin para bodega ${savedBodega.bodegaNombre}:`,
        error,
      );
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

      // Obtener el rol según el tipo de bodega
      const tipoBodega = bodega.bodegaTipo; // 'internas' | 'redes' | null
      let rolTipo = 'bodega-internas'; // Por defecto

      if (tipoBodega === 'redes') {
        rolTipo = 'bodega-redes';
      } else if (tipoBodega === 'internas') {
        rolTipo = 'bodega-internas';
      }

      const rolBodega = await this.rolesService.findByTipo(rolTipo);
      if (!rolBodega) {
        throw new Error(`Rol ${rolTipo} no encontrado`);
      }

      // Crear contraseña: admin + nombre de la bodega (sin espacios, en minúsculas)
      // Formato: adminnombrebodega
      const password = `admin${nombreNormalizado}`;

      // Crear el usuario
      const nuevoUsuario = await this.usersService.create(
        {
          usuarioRolId: rolBodega.rolId,
          usuarioSede: sedeId || undefined,
          usuarioBodega: bodega.bodegaId,
          usuarioNombre: 'Administrador',
          usuarioApellido: bodega.bodegaNombre,
          usuarioCorreo: email,
          usuarioDocumento: documento,
          usuarioContrasena: password,
        },
        undefined,
      );

      // Asegurar que el usuario esté activo
      if (!nuevoUsuario.usuarioEstado) {
        await this.usersService.updateEstado(nuevoUsuario.usuarioId, true);
      }
    } catch (error) {
      console.error(
        `[BodegasService] Error al crear usuario admin para bodega ${bodega.bodegaNombre}:`,
        error,
      );
      throw error;
    }
  }

  async findAll(user?: any): Promise<Bodega[]> {
    const allBodegas = await this.bodegasRepository.find({ relations: ['sede'] });

    // SuperAdmin y Gerencia ven todo
    if (
      user?.usuarioRol?.rolTipo === 'superadmin' ||
      user?.role === 'superadmin' ||
      user?.usuarioRol?.rolTipo === 'gerencia' ||
      user?.role === 'gerencia'
    ) {
      return allBodegas;
    }

    // Admin ve solo bodegas de su centro operativo
    if (user?.usuarioRol?.rolTipo === 'admin' || user?.role === 'admin') {
      const sedeId = user.usuarioSede ?? user.sede?.sedeId;
      if (sedeId != null) {
        return allBodegas.filter((bodega) => bodega.sedeId === sedeId);
      }
      return [];
    }

    // Administrador de Internas - bodegas tipo internas y bodega de instalaciones de su sede
    if (user?.usuarioRol?.rolTipo === 'admin-internas' || user?.role === 'admin-internas') {
      return allBodegas.filter(
        (bodega) =>
          bodega.sedeId === user.usuarioSede &&
          (bodega.bodegaTipo === 'internas' || bodega.bodegaTipo === 'instalaciones'),
      );
    }

    // Administrador de Redes - bodegas tipo redes y bodega de instalaciones de su sede
    if (user?.usuarioRol?.rolTipo === 'admin-redes' || user?.role === 'admin-redes') {
      return allBodegas.filter(
        (bodega) =>
          bodega.sedeId === user.usuarioSede &&
          (bodega.bodegaTipo === 'redes' || bodega.bodegaTipo === 'instalaciones'),
      );
    }

    // Bodega Internas - solo ve bodegas de tipo internas (y su propia bodega si está asignada)
    if (user?.usuarioRol?.rolTipo === 'bodega-internas' || user?.role === 'bodega-internas') {
      return allBodegas.filter((bodega) => {
        // Si tiene bodega asignada, puede ver su bodega
        if (user.usuarioBodega && bodega.bodegaId === user.usuarioBodega) {
          return true;
        }
        // Solo puede ver bodegas de tipo 'internas'
        return bodega.bodegaTipo === 'internas';
      });
    }

    // Bodega Redes - solo ve bodegas de tipo redes (y su propia bodega si está asignada)
    if (user?.usuarioRol?.rolTipo === 'bodega-redes' || user?.role === 'bodega-redes') {
      return allBodegas.filter((bodega) => {
        // Si tiene bodega asignada, puede ver su bodega
        if (user.usuarioBodega && bodega.bodegaId === user.usuarioBodega) {
          return true;
        }
        // Solo puede ver bodegas de tipo 'redes'
        return bodega.bodegaTipo === 'redes';
      });
    }

    // Almacenista ve todas las bodegas
    if (user?.usuarioRol?.rolTipo === 'almacenista' || user?.role === 'almacenista') {
      return allBodegas;
    }

    return allBodegas;
  }

  async findOne(id: number, user?: any): Promise<Bodega> {
    const bodega = await this.bodegasRepository.findOne({
      where: { bodegaId: id },
      relations: ['sede', 'usuarios'],
    });
    if (!bodega) {
      throw new NotFoundException(`Bodega with ID ${id} not found`);
    }
    if (user) {
      const rolTipo = user.usuarioRol?.rolTipo || user.role;
      const sedeId = user.usuarioSede ?? user.sede?.sedeId;
      if (rolTipo === 'admin' && sedeId != null && bodega.sedeId !== sedeId) {
        throw new NotFoundException(`Bodega with ID ${id} not found`);
      }
      if (rolTipo === 'admin-internas') {
        if (bodega.sedeId !== user.usuarioSede || bodega.bodegaTipo !== 'internas') {
          throw new NotFoundException(`Bodega with ID ${id} not found`);
        }
      } else if (rolTipo === 'admin-redes') {
        if (bodega.sedeId !== user.usuarioSede || bodega.bodegaTipo !== 'redes') {
          throw new NotFoundException(`Bodega with ID ${id} not found`);
        }
      }
    }
    return bodega;
  }

  async update(id: number, updateBodegaDto: UpdateBodegaDto, user?: any): Promise<Bodega> {
    const bodega = await this.findOne(id, user);

    // Validar permisos
    if (user) {
      const rolTipo = user.usuarioRol?.rolTipo || user.role;

      // Solo superadmin, gerencia, admin, admin-internas y admin-redes pueden editar bodegas
      if (
        rolTipo !== 'superadmin' &&
        rolTipo !== 'gerencia' &&
        rolTipo !== 'admin' &&
        rolTipo !== 'admin-internas' &&
        rolTipo !== 'admin-redes'
      ) {
        throw new BadRequestException('No tienes permisos para editar bodegas');
      }

      // Admin solo puede editar bodegas de su centro operativo
      const sedeId = user.usuarioSede ?? user.sede?.sedeId;
      if (rolTipo === 'admin' && sedeId != null && bodega.sedeId !== sedeId) {
        throw new BadRequestException('No tienes permisos para editar bodegas de otras sedes');
      }

      // Administrador de Internas solo puede editar bodegas tipo internas de su sede
      if (rolTipo === 'admin-internas') {
        if (bodega.sedeId !== user.usuarioSede || bodega.bodegaTipo !== 'internas') {
          throw new BadRequestException(
            'Solo puedes editar bodegas de tipo internas de tu centro operativo',
          );
        }
      }

      // Administrador de Redes solo puede editar bodegas tipo redes de su sede
      if (rolTipo === 'admin-redes') {
        if (bodega.sedeId !== user.usuarioSede || bodega.bodegaTipo !== 'redes') {
          throw new BadRequestException(
            'Solo puedes editar bodegas de tipo redes de tu centro operativo',
          );
        }
      }
    }

    const estadoAnterior = bodega.bodegaEstado;
    Object.assign(bodega, updateBodegaDto);
    const bodegaActualizada = await this.bodegasRepository.save(bodega);

    // Si la bodega se desactiva, cerrar su chat
    if (estadoAnterior && !bodegaActualizada.bodegaEstado) {
      try {
        await this.gruposService.cerrarChat(
          TipoGrupo.BODEGA,
          id,
          `Chat cerrado: La bodega "${bodegaActualizada.bodegaNombre}" ha sido desactivada.`,
        );
      } catch (error) {
        console.error(`[BodegasService] Error al cerrar chat de bodega ${id}:`, error);
      }
    }

    return bodegaActualizada;
  }

  async remove(id: number, user?: any): Promise<void> {
    const bodega = await this.findOne(id, user);

    // Validar permisos - solo superadmin y gerencia pueden eliminar
    if (user) {
      const rolTipo = user.usuarioRol?.rolTipo || user.role;
      if (rolTipo !== 'superadmin' && rolTipo !== 'gerencia') {
        throw new BadRequestException('No tienes permisos para eliminar bodegas');
      }
    }

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
