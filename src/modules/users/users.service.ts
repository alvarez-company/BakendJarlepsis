import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { GruposService } from '../grupos/grupos.service';
import { UsuariosGruposService } from '../usuarios-grupos/usuarios-grupos.service';
import { TipoGrupo } from '../grupos/grupo.entity';
import { InventarioTecnicoService } from '../inventario-tecnico/inventario-tecnico.service';
import { MovimientosService } from '../movimientos/movimientos.service';
import { InventariosService } from '../inventarios/inventarios.service';
import { BodegasService } from '../bodegas/bodegas.service';
import { RolesService } from '../roles/roles.service';
import { TipoMovimiento } from '../movimientos/movimiento-inventario.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @Inject(forwardRef(() => GruposService))
    private gruposService: GruposService,
    @Inject(forwardRef(() => UsuariosGruposService))
    private usuariosGruposService: UsuariosGruposService,
    @Inject(forwardRef(() => InventarioTecnicoService))
    private inventarioTecnicoService: InventarioTecnicoService,
    @Inject(forwardRef(() => MovimientosService))
    private movimientosService: MovimientosService,
    @Inject(forwardRef(() => InventariosService))
    private inventariosService: InventariosService,
    @Inject(forwardRef(() => BodegasService))
    private bodegasService: BodegasService,
    @Inject(forwardRef(() => RolesService))
    private rolesService: RolesService,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    creadorId?: number,
    creadorRolTipo?: string,
  ): Promise<User> {
    // ============================================
    // Validación de permisos por rol del creador
    // ============================================
    // Reglas:
    // - superadmin y gerencia: pueden crear cualquier rol excepto superadmin (el rol superadmin no se asigna por API)
    // - admin (centro operativo): SOLO pueden crear usuarios con roles: tecnico, soldador, almacenista, etc.
    const rolObjetivoEntityForCreate = await this.rolesService.findOne(createUserDto.usuarioRolId).catch(() => null);
    const rolObjetivoForCreate = (rolObjetivoEntityForCreate?.rolTipo || '').toLowerCase();
    if (rolObjetivoForCreate === 'superadmin') {
      throw new BadRequestException(
        'No se puede crear un usuario con el rol Super Administrador. Ese rol es exclusivo del desarrollador del sistema.',
      );
    }

    // Solo Gerencia (y SuperAdmin) pueden crear usuarios con rol Administrador de centro operativo (admin)
    const rolCreadorForAdminCheck = (creadorRolTipo || '').toLowerCase();
    if (
      rolObjetivoForCreate === 'admin' &&
      rolCreadorForAdminCheck !== 'superadmin' &&
      rolCreadorForAdminCheck !== 'gerencia'
    ) {
      throw new BadRequestException(
        'Solo el rol Gerencia puede crear usuarios Administrador de centro operativo.',
      );
    }

    if (creadorId) {
      const rolCreador = (creadorRolTipo || '').toLowerCase();

      if (
        rolCreador === 'admin' ||
        rolCreador === 'admin-internas' ||
        rolCreador === 'admin-redes'
      ) {
        const creator = await this.findOne(creadorId);
        if (!creator.usuarioSede) {
          throw new BadRequestException(
            'Tu usuario no tiene centro operativo asignado. No puedes crear usuarios.',
          );
        }

        const rolObjetivoEntity = await this.rolesService.findOne(createUserDto.usuarioRolId);
        const rolObjetivo = (rolObjetivoEntity?.rolTipo || '').toLowerCase();

        // Administrador de centro operativo: puede crear cualquier rol excepto admin (solo Gerencia crea admin)
        const rolesAdminCentro = [
          'tecnico',
          'soldador',
          'almacenista',
          'admin-internas',
          'admin-redes',
          'bodega-internas',
          'bodega-redes',
        ];
        // Administrador de Internas: solo técnicos, soldador, almacenista, bodega-internas (para su bodega/contexto)
        const rolesAdminInternas = ['tecnico', 'soldador', 'almacenista', 'bodega-internas'];
        // Administrador de Redes: solo técnicos, soldador, almacenista, bodega-redes
        const rolesAdminRedes = ['tecnico', 'soldador', 'almacenista', 'bodega-redes'];

        const permitidos =
          rolCreador === 'admin'
            ? rolesAdminCentro
            : rolCreador === 'admin-internas'
              ? rolesAdminInternas
              : rolesAdminRedes;

        if (!permitidos.includes(rolObjetivo)) {
          const msg =
            rolCreador === 'admin'
              ? 'Solo puedes crear: Técnico, Soldador, Almacenista, Administrador de Internas, Administrador de Redes, Bodega Internas y Bodega Redes.'
              : rolCreador === 'admin-internas'
                ? 'Solo puedes crear: Técnico, Soldador, Almacenista y Bodega Internas (para tu centro operativo).'
                : 'Solo puedes crear: Técnico, Soldador, Almacenista y Bodega Redes (para tu centro operativo).';
          throw new BadRequestException(`No tienes permiso para crear usuarios con ese rol. ${msg}`);
        }

        const rolesRequierenSede = [
          'admin',
          'admin-internas',
          'admin-redes',
          'almacenista',
          'tecnico',
          'soldador',
        ];
        const rolesRequierenBodega = ['bodega-internas', 'bodega-redes'];

        if (rolesRequierenSede.includes(rolObjetivo)) {
          if (
            createUserDto.usuarioSede != null &&
            createUserDto.usuarioSede !== creator.usuarioSede
          ) {
            throw new BadRequestException(
              'Solo puedes crear usuarios para tu centro operativo.',
            );
          }
          createUserDto.usuarioSede = creator.usuarioSede;
        } else if (rolesRequierenBodega.includes(rolObjetivo)) {
          if (createUserDto.usuarioBodega != null) {
            const bodega = await this.bodegasService.findOne(createUserDto.usuarioBodega);
            if (bodega.sedeId !== creator.usuarioSede) {
              throw new BadRequestException(
                'Solo puedes crear usuarios para bodegas de tu centro operativo.',
              );
            }
            if (rolCreador === 'admin-internas' && bodega.bodegaTipo !== 'internas') {
              throw new BadRequestException(
                'Solo puedes crear usuarios para bodegas de tipo internas de tu centro operativo.',
              );
            }
            if (rolCreador === 'admin-redes' && bodega.bodegaTipo !== 'redes') {
              throw new BadRequestException(
                'Solo puedes crear usuarios para bodegas de tipo redes de tu centro operativo.',
              );
            }
          }
        }
      }
    }

    // Validar que el correo no exista
    const existingEmail = await this.findByEmail(createUserDto.usuarioCorreo);
    if (existingEmail) {
      throw new ConflictException('El correo electrónico ya está en uso');
    }

    // Validar que el documento no exista
    const existingDocument = await this.findByDocument(createUserDto.usuarioDocumento);
    if (existingDocument) {
      throw new ConflictException('El documento ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.usuarioContrasena, 10);

    // Validar campos requeridos según el rol objetivo
    try {
      const rolObjetivoEntity = await this.rolesService.findOne(createUserDto.usuarioRolId);
      const rolObjetivo = (rolObjetivoEntity?.rolTipo || '').toLowerCase();

      const rolesRequierenCentroOperativo = [
        'admin',
        'admin-internas',
        'admin-redes',
        'almacenista',
        'tecnico',
        'soldador',
      ];
      const rolesRequierenBodega = ['bodega-internas', 'bodega-redes'];

      if (rolObjetivo === 'superadmin' || rolObjetivo === 'gerencia') {
        // SuperAdmin y Gerencia no requieren sede/bodega
      } else if (rolesRequierenCentroOperativo.includes(rolObjetivo)) {
        if (!createUserDto.usuarioSede) {
          throw new BadRequestException('Este rol requiere Centro Operativo (usuarioSede).');
        }
      } else if (rolesRequierenBodega.includes(rolObjetivo)) {
        if (!createUserDto.usuarioBodega) {
          throw new BadRequestException('Este rol requiere Bodega (usuarioBodega).');
        }
      }
    } catch (e) {
      // Si falla la obtención del rol o validación, dejar pasar el error tal cual
      throw e;
    }

    // Convertir valores 0 a null para campos opcionales
    const userData: DeepPartial<User> = {
      ...createUserDto,
      usuarioContrasena: hashedPassword,
      usuarioCreador: creadorId,
    };

    if (userData.usuarioSede === 0) {
      userData.usuarioSede = null;
    }
    if (userData.usuarioBodega === 0) {
      userData.usuarioBodega = null;
    }

    const user = this.usersRepository.create(userData);
    const savedUser = await this.usersRepository.save(user);

    // Asignar automáticamente al grupo general para que pueda comunicarse con todos
    try {
      const grupoGeneral = await this.gruposService.obtenerGrupoGeneral();
      await this.usuariosGruposService.agregarUsuarioGrupo(
        grupoGeneral.grupoId,
        savedUser.usuarioId,
      );
    } catch (error) {
      console.error(
        `[UsersService] Error al asignar usuario ${savedUser.usuarioId} al grupo general:`,
        error,
      );
    }

    // Si el usuario tiene sede asignada, asignarlo al grupo de la sede
    if (savedUser.usuarioSede) {
      try {
        const grupoSede = await this.gruposService.obtenerGrupoPorEntidad(
          TipoGrupo.SEDE,
          savedUser.usuarioSede,
        );
        if (grupoSede) {
          await this.usuariosGruposService.agregarUsuarioGrupo(
            grupoSede.grupoId,
            savedUser.usuarioId,
          );
        }
      } catch (error) {
        console.error(
          `[UsersService] Error al asignar usuario ${savedUser.usuarioId} al grupo de sede:`,
          error,
        );
      }
    }

    // Si el usuario tiene bodega asignada, asignarlo al grupo de la bodega
    if (savedUser.usuarioBodega) {
      try {
        const grupoBodega = await this.gruposService.obtenerGrupoPorEntidad(
          TipoGrupo.BODEGA,
          savedUser.usuarioBodega,
        );
        if (grupoBodega) {
          await this.usuariosGruposService.agregarUsuarioGrupo(
            grupoBodega.grupoId,
            savedUser.usuarioId,
          );
        }
      } catch (error) {
        console.error(
          `[UsersService] Error al asignar usuario ${savedUser.usuarioId} al grupo de bodega:`,
          error,
        );
      }
    }

    return savedUser;
  }

  async findAll(
    paginationDto?: PaginationDto,
    search?: string,
    requestingUser?: { usuarioRol?: { rolTipo: string }; role?: string; usuarioSede?: number },
  ): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const page = paginationDto?.page || 1;
    const limit = paginationDto?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.usuarioRol', 'rol')
      .leftJoinAndSelect('user.sede', 'sede')
      .leftJoinAndSelect('user.bodega', 'bodega');

    // El usuario SuperAdmin no se lista nunca (rol exclusivo del desarrollador, un solo usuario en el sistema)
    queryBuilder.andWhere('rol.rolTipo != :superadmin', { superadmin: 'superadmin' });

    // Usuarios no compartidos entre centros: quien tenga sede asignada solo ve usuarios de su centro operativo
    if (requestingUser?.usuarioSede) {
      queryBuilder.andWhere('user.usuarioSede = :sedeId', {
        sedeId: requestingUser.usuarioSede,
      });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.usuarioNombre LIKE :search OR user.usuarioApellido LIKE :search OR user.usuarioCorreo LIKE :search OR user.usuarioDocumento LIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy('user.fechaCreacion', 'DESC').skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(
    id: number,
    requestingUser?: {
      usuarioId?: number;
      usuarioRol?: { rolTipo: string };
      role?: string;
      usuarioSede?: number;
    },
  ): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { usuarioId: id },
      relations: ['usuarioRol', 'sede', 'bodega'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    // El usuario SuperAdmin no es visible para otros; solo para él mismo. Sin requestingUser (ej. validación JWT) se permite.
    const userRolTipo = user.usuarioRol?.rolTipo?.toLowerCase();
    if (userRolTipo === 'superadmin') {
      const requesterId = requestingUser?.usuarioId;
      if (requestingUser != null && requesterId !== id) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
    }
    // Usuarios no compartidos: quien tenga sede solo puede ver usuarios de su centro operativo
    if (requestingUser?.usuarioSede != null && user.usuarioSede !== requestingUser.usuarioSede) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  /**
   * Carga un usuario por ID solo para validación JWT. No aplica reglas de visibilidad (SuperAdmin oculto).
   * Usar solo en JwtStrategy para evitar 404 al validar el token del SuperAdmin.
   */
  async findOneForAuth(id: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { usuarioId: id },
      relations: ['usuarioRol', 'sede', 'bodega'],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { usuarioCorreo: email },
      relations: ['usuarioRol'],
    });
  }

  async findByDocument(documento: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { usuarioDocumento: documento },
      relations: ['usuarioRol'],
    });
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    requestingUserId?: number,
    requestingUserRole?: string,
  ): Promise<User> {
    const user = await this.findOne(id);

    // Si se intenta cambiar la contraseña, solo superadmin y gerencia pueden cambiar contraseñas de otros usuarios
    if (updateUserDto.usuarioContrasena) {
      const puedeCambiarContrasenaOtros =
        requestingUserRole === 'superadmin' || requestingUserRole === 'gerencia';
      if (requestingUserId && !puedeCambiarContrasenaOtros && requestingUserId !== id) {
        throw new BadRequestException(
          'Solo puedes cambiar tu propia contraseña. Los cambios de contraseña de otros usuarios solo pueden ser realizados por SuperAdmin o Gerencia.',
        );
      }
      updateUserDto.usuarioContrasena = await bcrypt.hash(updateUserDto.usuarioContrasena, 10);
    }

    // Si se intenta cambiar el rol, solo superadmin y gerencia pueden hacerlo (y nadie puede asignar el rol superadmin)
    if (
      updateUserDto.usuarioRolId !== undefined &&
      updateUserDto.usuarioRolId !== user.usuarioRolId
    ) {
      if (requestingUserRole !== 'superadmin' && requestingUserRole !== 'gerencia') {
        throw new BadRequestException('Solo SuperAdmin o Gerencia pueden cambiar roles de usuarios');
      }
      const newRoleForUpdate = await this.rolesService.findOne(updateUserDto.usuarioRolId);
      if (newRoleForUpdate?.rolTipo?.toLowerCase() === 'superadmin') {
        throw new BadRequestException(
          'No se puede asignar el rol Super Administrador. Ese rol es exclusivo del desarrollador del sistema.',
        );
      }
    }

    // Validar que el correo no esté en uso por otro usuario
    if (updateUserDto.usuarioCorreo && updateUserDto.usuarioCorreo !== user.usuarioCorreo) {
      const existingEmail = await this.findByEmail(updateUserDto.usuarioCorreo);
      if (existingEmail && existingEmail.usuarioId !== id) {
        throw new ConflictException('El correo electrónico ya está en uso');
      }
    }

    // Validar que el documento no esté en uso por otro usuario
    if (
      updateUserDto.usuarioDocumento &&
      updateUserDto.usuarioDocumento !== user.usuarioDocumento
    ) {
      const existingDocument = await this.findByDocument(updateUserDto.usuarioDocumento);
      if (existingDocument && existingDocument.usuarioId !== id) {
        throw new ConflictException('El documento ya está registrado');
      }
    }

    // Convertir valores 0 a null para campos opcionales
    if (updateUserDto.usuarioSede === 0) {
      updateUserDto.usuarioSede = null;
    }
    if (updateUserDto.usuarioBodega === 0) {
      updateUserDto.usuarioBodega = null;
    }

    // Actualizar explícitamente el rol si viene en el DTO
    if (
      updateUserDto.usuarioRolId !== undefined &&
      updateUserDto.usuarioRolId !== user.usuarioRolId
    ) {
      // Obtener el nuevo rol para validar qué campos requiere
      const newRole = await this.rolesService.findOne(updateUserDto.usuarioRolId);
      const rolTipo = newRole.rolTipo?.toLowerCase();

      // Actualizar el rol
      user.usuarioRolId = updateUserDto.usuarioRolId;

      // Limpiar campos según el nuevo rol
      // Roles que requieren centro operativo: admin, admin-internas, admin-redes, almacenista, tecnico, soldador
      const rolesRequierenCentroOperativo = [
        'admin',
        'admin-internas',
        'admin-redes',
        'almacenista',
        'tecnico',
        'soldador',
      ];
      // Roles que requieren bodega: bodega-internas, bodega-redes
      const rolesRequierenBodega = ['bodega-internas', 'bodega-redes'];

      if (rolTipo === 'superadmin' || rolTipo === 'gerencia') {
        // SuperAdmin y Gerencia no necesitan centro operativo ni bodega
        user.usuarioSede = null;
        user.usuarioBodega = null;
      } else if (rolesRequierenBodega.includes(rolTipo)) {
        // Si el nuevo rol requiere bodega, limpiar centro operativo
        user.usuarioSede = null;
        // Si no viene usuarioBodega en el DTO y el usuario no tenía bodega, mantener null
        // El frontend debe enviar usuarioBodega si es requerido
      } else if (rolesRequierenCentroOperativo.includes(rolTipo)) {
        // Si el nuevo rol requiere centro operativo, limpiar bodega
        user.usuarioBodega = null;
        // Si no viene usuarioSede en el DTO y el usuario no tenía sede, mantener null
        // El frontend debe enviar usuarioSede si es requerido
      }
    }

    Object.assign(user, updateUserDto);

    // El rol Administrador siempre debe tener centro operativo asignado
    const rolesRequierenCentroOperativo = ['admin', 'admin-internas', 'admin-redes'];
    const rolEntity = await this.rolesService.findOne(user.usuarioRolId);
    const rolTipoStr = (rolEntity?.rolTipo ?? '').toString().toLowerCase();
    if (rolesRequierenCentroOperativo.includes(rolTipoStr) && !user.usuarioSede) {
      throw new BadRequestException(
        'El rol Administrador debe tener un centro operativo (usuarioSede) asignado.',
      );
    }

    const savedUser = await this.usersRepository.save(user);

    // Recargar el usuario con sus relaciones para asegurar que el cambio se refleje
    return this.findOne(savedUser.usuarioId);
  }

  async changeRole(id: number, newRoleId: number): Promise<User> {
    // Validar que el usuario existe
    const user = await this.findOne(id);

    // Validar que el nuevo rol existe
    if (!newRoleId || newRoleId <= 0) {
      throw new BadRequestException('El ID del rol es inválido');
    }

    // Obtener el nuevo rol para validar qué campos requiere
    const newRole = await this.rolesService.findOne(newRoleId);
    if (!newRole || !newRole.rolEstado) {
      throw new BadRequestException('El rol seleccionado no existe o está inactivo');
    }

    const rolTipo = newRole.rolTipo?.toLowerCase();

    // Nadie puede asignar el rol Super Administrador por API (exclusivo del desarrollador)
    if (rolTipo === 'superadmin') {
      throw new BadRequestException(
        'No se puede asignar el rol Super Administrador. Ese rol es exclusivo del desarrollador del sistema.',
      );
    }

    // Validar que no se esté cambiando al mismo rol
    if (user.usuarioRolId === newRoleId) {
      throw new BadRequestException('El usuario ya tiene este rol asignado');
    }

    // Actualizar el rol
    user.usuarioRolId = newRoleId;

    // Limpiar campos según el nuevo rol
      // Roles que requieren centro operativo: admin, admin-internas, admin-redes, almacenista, tecnico, soldador
      const rolesRequierenCentroOperativo = [
        'admin',
        'admin-internas',
        'admin-redes',
        'almacenista',
        'tecnico',
        'soldador',
      ];
      // Roles que requieren bodega: bodega-internas, bodega-redes
      const rolesRequierenBodega = ['bodega-internas', 'bodega-redes'];

      if (rolTipo === 'superadmin' || rolTipo === 'gerencia') {
        // SuperAdmin y Gerencia no necesitan centro operativo ni bodega
        user.usuarioSede = null;
        user.usuarioBodega = null;
      } else if (rolesRequierenBodega.includes(rolTipo)) {
        // Si el nuevo rol requiere bodega, limpiar centro operativo
        user.usuarioSede = null;
        // Mantener usuarioBodega si ya está asignado, de lo contrario se debe asignar en el frontend
      } else if (rolesRequierenCentroOperativo.includes(rolTipo)) {
      // Si el nuevo rol requiere centro operativo, limpiar bodega
      user.usuarioBodega = null;
      // Mantener usuarioSede si ya está asignado, de lo contrario se debe asignar en el frontend
    }

    const savedUser = await this.usersRepository.save(user);

    // Recargar el usuario con sus relaciones para asegurar que el cambio se refleje
    return this.findOne(savedUser.usuarioId);
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto): Promise<User> {
    const user = await this.findOne(userId);

    // Validar contraseña actual
    if (!user.usuarioContrasena) {
      throw new BadRequestException('Usuario sin contraseña configurada');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.usuarioContrasena,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    // Validar que la nueva contraseña sea diferente
    const isSamePassword = await bcrypt.compare(
      changePasswordDto.newPassword,
      user.usuarioContrasena,
    );

    if (isSamePassword) {
      throw new BadRequestException('La nueva contraseña debe ser diferente a la actual');
    }

    // Hashear y actualizar la nueva contraseña
    const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    user.usuarioContrasena = hashedNewPassword;

    return this.usersRepository.save(user);
  }

  async updateMyProfile(userId: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(userId);

    // Validar que el correo no esté en uso por otro usuario
    if (updateUserDto.usuarioCorreo && updateUserDto.usuarioCorreo !== user.usuarioCorreo) {
      const existingEmail = await this.findByEmail(updateUserDto.usuarioCorreo);
      if (existingEmail && existingEmail.usuarioId !== userId) {
        throw new ConflictException('El correo electrónico ya está en uso');
      }
    }

    // Validar que el documento no esté en uso por otro usuario
    if (
      updateUserDto.usuarioDocumento &&
      updateUserDto.usuarioDocumento !== user.usuarioDocumento
    ) {
      const existingDocument = await this.findByDocument(updateUserDto.usuarioDocumento);
      if (existingDocument && existingDocument.usuarioId !== userId) {
        throw new ConflictException('El documento ya está registrado');
      }
    }

    // No permitir cambiar contraseña desde aquí (usar changePassword)
    if (updateUserDto.usuarioContrasena) {
      delete updateUserDto.usuarioContrasena;
    }

    // No permitir cambiar rol desde aquí
    if (updateUserDto.usuarioRolId) {
      delete updateUserDto.usuarioRolId;
    }

    // No permitir cambiar estado desde aquí
    if ('usuarioEstado' in updateUserDto) {
      delete (updateUserDto as any).usuarioEstado;
    }

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async updateEstado(id: number, estado: boolean): Promise<User> {
    const user = await this.findOne(id);
    user.usuarioEstado = estado;
    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    if (user.usuarioRol?.rolTipo?.toLowerCase() === 'superadmin') {
      throw new BadRequestException(
        'No se puede eliminar el usuario Super Administrador. Ese rol es exclusivo del desarrollador del sistema.',
      );
    }
    await this.usersRepository.remove(user);
  }

  async cancelarContrato(
    usuarioId: number,
    usuarioEjecutorId: number,
  ): Promise<{ message: string; materialesTransferidos: number }> {
    // Obtener el técnico
    const tecnico = await this.findOne(usuarioId);

    // Verificar que sea un técnico
    if (tecnico.usuarioRol?.rolTipo !== 'tecnico') {
      throw new BadRequestException('El usuario no es un técnico');
    }

    // Verificar que tenga sede asignada
    if (!tecnico.usuarioSede) {
      throw new BadRequestException('El técnico no tiene sede asignada');
    }

    // Obtener el inventario del técnico
    const inventarioTecnico = await this.inventarioTecnicoService.findByUsuario(usuarioId);

    if (inventarioTecnico.length === 0) {
      // Si no tiene materiales, solo desactivar el usuario
      await this.updateEstado(usuarioId, false);
      return {
        message: 'Contrato cancelado. El técnico no tenía materiales en inventario.',
        materialesTransferidos: 0,
      };
    }

    // Obtener todas las bodegas de la sede
    const bodegas = await this.bodegasService.findAll();
    const bodegasSede = bodegas.filter((b) => b.sedeId === tecnico.usuarioSede);

    if (bodegasSede.length === 0) {
      throw new BadRequestException('No se encontraron bodegas para la sede del técnico');
    }

    // Obtener todos los inventarios de las bodegas de la sede
    const todosInventarios = await this.inventariosService.findAll();
    const inventariosSede = todosInventarios.filter((inv) => {
      const bodega = bodegasSede.find((b) => b.bodegaId === inv.bodegaId);
      return bodega !== undefined;
    });

    if (inventariosSede.length === 0) {
      throw new BadRequestException('No se encontraron inventarios para las bodegas de la sede');
    }

    // Agrupar materiales por materialId y sumar cantidades
    const materialesAgrupados = new Map<number, number>();
    inventarioTecnico.forEach((item) => {
      const cantidadActual = materialesAgrupados.get(item.materialId) || 0;
      materialesAgrupados.set(item.materialId, cantidadActual + Number(item.cantidad || 0));
    });

    // Transferir cada material directamente al stock de la sede (sin asignar a bodega específica)
    let materialesTransferidos = 0;
    const codigoMovimiento = `TRANSFERENCIA-CONTRATO-${usuarioId}-${Date.now()}`;

    for (const [materialId, cantidadTotal] of materialesAgrupados.entries()) {
      try {
        // Crear movimiento de entrada SIN inventarioId para que vaya al stock de la sede
        await this.movimientosService.create({
          movimientoTipo: TipoMovimiento.ENTRADA,
          materiales: [
            {
              materialId: materialId,
              movimientoCantidad: cantidadTotal,
            },
          ],
          inventarioId: null, // null para que vaya al stock de la sede
          usuarioId: usuarioEjecutorId,
          movimientoObservaciones: `Transferencia por cancelación de contrato del técnico ${tecnico.usuarioNombre} ${tecnico.usuarioApellido}`,
          movimientoCodigo: codigoMovimiento,
        });

        materialesTransferidos++;
      } catch (error) {
        console.error(`Error al transferir material ${materialId}:`, error);
        // Continuar con los demás materiales aunque uno falle
      }
    }

    // Eliminar todo el inventario del técnico
    for (const item of inventarioTecnico) {
      try {
        await this.inventarioTecnicoService.remove(item.inventarioTecnicoId);
      } catch (error) {
        console.error(`Error al eliminar inventario técnico ${item.inventarioTecnicoId}:`, error);
      }
    }

    // Desactivar el usuario
    await this.updateEstado(usuarioId, false);

    return {
      message: `Contrato cancelado exitosamente. ${materialesTransferidos} material(es) transferido(s) al inventario de la sede.`,
      materialesTransferidos,
    };
  }
}
