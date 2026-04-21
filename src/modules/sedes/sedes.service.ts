import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sede } from './sede.entity';
import { Departamento } from '../departamentos/departamento.entity';
import { esDepartamentoZonaOperacion } from '../../common/constants/departamentos-operacion.constants';
import { CreateSedeDto } from './dto/create-sede.dto';
import { UpdateSedeDto } from './dto/update-sede.dto';
import { HasRelatedEntitiesException } from '../../common/exceptions/business.exception';
import { GruposService } from '../grupos/grupos.service';
import { TipoGrupo } from '../grupos/grupo.entity';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
import { BodegasService } from '../bodegas/bodegas.service';
import { InventariosService } from '../inventarios/inventarios.service';

@Injectable()
export class SedesService {
  constructor(
    @InjectRepository(Sede)
    private sedesRepository: Repository<Sede>,
    @InjectRepository(Departamento)
    private departamentosRepository: Repository<Departamento>,
    @Inject(forwardRef(() => GruposService))
    private gruposService: GruposService,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    private rolesService: RolesService,
    @Inject(forwardRef(() => BodegasService))
    private bodegasService: BodegasService,
    @Inject(forwardRef(() => InventariosService))
    private inventariosService: InventariosService,
  ) {}

  private async assertDepartamentoZonaOperacion(departamentoId: number): Promise<void> {
    const dep = await this.departamentosRepository.findOne({ where: { departamentoId } });
    if (!dep || !esDepartamentoZonaOperacion(dep.departamentoNombre)) {
      throw new BadRequestException(
        'Las sedes solo pueden ubicarse en Santander o Norte de Santander.',
      );
    }
  }

  async create(createSedeDto: CreateSedeDto): Promise<Sede> {
    await this.assertDepartamentoZonaOperacion(createSedeDto.departamentoId);
    const sede = this.sedesRepository.create(createSedeDto);
    const savedSede = await this.sedesRepository.save(sede);

    // Asegurar bodega/inventario "centro" (oculta en UI, usada para stock por centro operativo).
    try {
      const bodegaCentro = await this.bodegasService.findOrCreateBodegaCentroOperativo(
        savedSede.sedeId,
      );
      await this.inventariosService.findOrCreateByBodega(bodegaCentro.bodegaId, {
        inventarioNombre: `Inventario - Centro Operativo ${savedSede.sedeNombre}`,
        inventarioDescripcion: 'Inventario del centro operativo (bodega tipo centro)',
      });
    } catch (error) {
      console.error(
        `[SedesService] ❌ Error al asegurar bodega/inventario centro para sede ${savedSede.sedeNombre}:`,
        error,
      );
      // No lanzar error para no interrumpir la creación de la sede
    }

    // Crear grupo de chat automáticamente
    try {
      await this.gruposService.crearGrupoSede(savedSede.sedeId, savedSede.sedeNombre);
    } catch (error) {
      console.error(
        `[SedesService] ❌ Error al crear grupo de chat para sede ${savedSede.sedeNombre}:`,
        error,
      );
      console.error(`[SedesService] Stack trace:`, error.stack);
      // No lanzar error para no interrumpir la creación de la sede
    }

    // Crear usuario admin automáticamente
    try {
      await this.crearUsuarioAdminSede(savedSede);
    } catch (error) {
      console.error(
        `[SedesService] ❌ Error al crear usuario admin para sede ${savedSede.sedeNombre}:`,
        error,
      );
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
      const nuevoUsuario = await this.usersService.create(
        {
          usuarioRolId: rolAdmin.rolId,
          usuarioSede: sede.sedeId,
          usuarioNombre: 'Administrador',
          usuarioApellido: sede.sedeNombre,
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
        `[SedesService] Error al crear usuario admin para sede ${sede.sedeNombre}:`,
        error,
      );
      throw error;
    }
  }

  async findAll(user?: any): Promise<Sede[]> {
    const allSedes = await this.sedesRepository.find({ relations: ['bodegas'] });

    const rolTipo = (user?.usuarioRol?.rolTipo || user?.role || '').toLowerCase();

    // SuperAdmin y Gerencia ven todo (aunque tengan usuarioSede informado)
    if (rolTipo === 'superadmin' || rolTipo === 'gerencia') {
      return allSedes;
    }

    // Centro operativo: por columna usuarioSede o por relación sede (p. ej. usuario cargado con findOneForAuth)
    const sedeId = user?.usuarioSede ?? user?.sede?.sedeId;
    if (sedeId != null && Number(sedeId) > 0) {
      const sid = Number(sedeId);
      const filtradas = allSedes.filter((sede) => Number(sede.sedeId) === sid);
      if (filtradas.length > 0) return filtradas;
    }

    // Admin sin sede asignada: solo ve su centro; si no tiene asignado, lista vacía
    if (rolTipo === 'admin') {
      return [];
    }

    // Administrador de Internas y de Redes: solo su sede
    if (rolTipo === 'admin-internas' || rolTipo === 'admin-redes') {
      return [];
    }

    // Almacenista: solo su sede
    if (rolTipo === 'almacenista') {
      return [];
    }

    // Técnico y Soldador sin sede: no ven sedes
    if (rolTipo === 'tecnico' || rolTipo === 'soldador') {
      return [];
    }

    // Usuario autenticado que no encajó en ninguna regla: no exponer todas las sedes
    if (user) {
      return [];
    }
    return allSedes;
  }

  async findOne(id: number, user?: any): Promise<Sede> {
    const sede = await this.sedesRepository.findOne({
      where: { sedeId: id },
      relations: ['bodegas', 'usuarios'],
    });
    if (!sede) {
      throw new NotFoundException(`Sede with ID ${id} not found`);
    }
    const rolTipo = (user?.usuarioRol?.rolTipo || user?.role || '').toLowerCase();
    const veTodasLasSedes = rolTipo === 'superadmin' || rolTipo === 'gerencia';
    // Cualquier usuario con centro asignado solo puede ver su propia sede — salvo superadmin/gerencia
    const userSedeId = user?.usuarioSede ?? user?.sede?.sedeId;
    if (
      !veTodasLasSedes &&
      userSedeId != null &&
      Number(userSedeId) > 0 &&
      Number(sede.sedeId) !== Number(userSedeId)
    ) {
      throw new NotFoundException(`Sede with ID ${id} not found`);
    }
    return sede;
  }

  async update(id: number, updateSedeDto: UpdateSedeDto, user?: any): Promise<Sede> {
    const sede = await this.findOne(id);

    // Validar permisos: solo superadmin y gerencia pueden editar/desactivar sedes
    if (user) {
      const rolTipo = user.usuarioRol?.rolTipo || user.role;
      if (rolTipo !== 'superadmin' && rolTipo !== 'gerencia') {
        throw new BadRequestException('No tienes permisos para editar sedes');
      }
    }

    if (updateSedeDto.departamentoId !== undefined) {
      await this.assertDepartamentoZonaOperacion(updateSedeDto.departamentoId);
    }

    const estadoAnterior = sede.sedeEstado;
    Object.assign(sede, updateSedeDto);
    const sedeActualizada = await this.sedesRepository.save(sede);

    // Si la sede se desactiva, cerrar su chat
    if (estadoAnterior && !sedeActualizada.sedeEstado) {
      try {
        await this.gruposService.cerrarChat(
          TipoGrupo.SEDE,
          id,
          `Chat cerrado: La sede "${sedeActualizada.sedeNombre}" ha sido desactivada.`,
        );
      } catch (error) {
        console.error(`[SedesService] Error al cerrar chat de sede ${id}:`, error);
      }
    }

    return sedeActualizada;
  }

  async remove(id: number, user?: any): Promise<void> {
    const sede = await this.findOne(id);

    // Validar permisos - solo superadmin y gerencia pueden eliminar
    if (user) {
      const rolTipo = user.usuarioRol?.rolTipo || user.role;
      if (rolTipo !== 'superadmin' && rolTipo !== 'gerencia') {
        throw new BadRequestException('No tienes permisos para eliminar sedes');
      }
    }

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
