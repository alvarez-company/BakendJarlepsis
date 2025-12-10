import { Injectable, NotFoundException, BadRequestException, ConflictException, Inject, forwardRef } from '@nestjs/common';
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
  ) {}

  async create(createUserDto: CreateUserDto, creadorId?: number): Promise<User> {
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
      await this.usuariosGruposService.agregarUsuarioGrupo(grupoGeneral.grupoId, savedUser.usuarioId);
    } catch (error) {
      console.error(`[UsersService] Error al asignar usuario ${savedUser.usuarioId} al grupo general:`, error);
    }
    
    // Si el usuario tiene sede asignada, asignarlo al grupo de la sede
    if (savedUser.usuarioSede) {
      try {
        const grupoSede = await this.gruposService.obtenerGrupoPorEntidad(
          TipoGrupo.SEDE,
          savedUser.usuarioSede
        );
        if (grupoSede) {
          await this.usuariosGruposService.agregarUsuarioGrupo(grupoSede.grupoId, savedUser.usuarioId);
        }
      } catch (error) {
        console.error(`[UsersService] Error al asignar usuario ${savedUser.usuarioId} al grupo de sede:`, error);
      }
    }
    
    // Si el usuario tiene bodega asignada, asignarlo al grupo de la bodega
    if (savedUser.usuarioBodega) {
      try {
        const grupoBodega = await this.gruposService.obtenerGrupoPorEntidad(
          TipoGrupo.BODEGA,
          savedUser.usuarioBodega
        );
        if (grupoBodega) {
          await this.usuariosGruposService.agregarUsuarioGrupo(grupoBodega.grupoId, savedUser.usuarioId);
        }
      } catch (error) {
        console.error(`[UsersService] Error al asignar usuario ${savedUser.usuarioId} al grupo de bodega:`, error);
      }
    }
    
    return savedUser;
  }

  async findAll(paginationDto?: PaginationDto, search?: string): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const page = paginationDto?.page || 1;
    const limit = paginationDto?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.usuarioRol', 'rol')
      .leftJoinAndSelect('user.sede', 'sede')
      .leftJoinAndSelect('user.bodega', 'bodega');

    if (search) {
      queryBuilder.where(
        'user.usuarioNombre LIKE :search OR user.usuarioApellido LIKE :search OR user.usuarioCorreo LIKE :search OR user.usuarioDocumento LIKE :search',
        { search: `%${search}%` }
      );
    }

    queryBuilder
      .orderBy('user.fechaCreacion', 'DESC')
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

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { usuarioId: id },
      relations: ['usuarioRol', 'sede', 'bodega'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
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

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    
    // Validar que el correo no esté en uso por otro usuario
    if (updateUserDto.usuarioCorreo && updateUserDto.usuarioCorreo !== user.usuarioCorreo) {
      const existingEmail = await this.findByEmail(updateUserDto.usuarioCorreo);
      if (existingEmail && existingEmail.usuarioId !== id) {
        throw new ConflictException('El correo electrónico ya está en uso');
      }
    }

    // Validar que el documento no esté en uso por otro usuario
    if (updateUserDto.usuarioDocumento && updateUserDto.usuarioDocumento !== user.usuarioDocumento) {
      const existingDocument = await this.findByDocument(updateUserDto.usuarioDocumento);
      if (existingDocument && existingDocument.usuarioId !== id) {
        throw new ConflictException('El documento ya está registrado');
      }
    }

    if (updateUserDto.usuarioContrasena) {
      updateUserDto.usuarioContrasena = await bcrypt.hash(updateUserDto.usuarioContrasena, 10);
    }

    // Convertir valores 0 a null para campos opcionales
    if (updateUserDto.usuarioSede === 0) {
      updateUserDto.usuarioSede = null;
    }
    if (updateUserDto.usuarioBodega === 0) {
      updateUserDto.usuarioBodega = null;
    }

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async changeRole(id: number, newRoleId: number): Promise<User> {
    const user = await this.findOne(id);
    user.usuarioRolId = newRoleId;
    return this.usersRepository.save(user);
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto): Promise<User> {
    const user = await this.findOne(userId);
    
    // Validar contraseña actual
    if (!user.usuarioContrasena) {
      throw new BadRequestException('Usuario sin contraseña configurada');
    }
    
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.usuarioContrasena
    );
    
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }
    
    // Validar que la nueva contraseña sea diferente
    const isSamePassword = await bcrypt.compare(
      changePasswordDto.newPassword,
      user.usuarioContrasena
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
    if (updateUserDto.usuarioDocumento && updateUserDto.usuarioDocumento !== user.usuarioDocumento) {
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
    await this.usersRepository.remove(user);
  }

  async cancelarContrato(usuarioId: number, usuarioEjecutorId: number): Promise<{ message: string; materialesTransferidos: number }> {
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
        materialesTransferidos: 0
      };
    }

    // Obtener todas las bodegas de la sede
    const bodegas = await this.bodegasService.findAll();
    const bodegasSede = bodegas.filter(b => b.sedeId === tecnico.usuarioSede);

    if (bodegasSede.length === 0) {
      throw new BadRequestException('No se encontraron bodegas para la sede del técnico');
    }

    // Obtener todos los inventarios de las bodegas de la sede
    const todosInventarios = await this.inventariosService.findAll();
    const inventariosSede = todosInventarios.filter(inv => {
      const bodega = bodegasSede.find(b => b.bodegaId === inv.bodegaId);
      return bodega !== undefined;
    });

    if (inventariosSede.length === 0) {
      throw new BadRequestException('No se encontraron inventarios para las bodegas de la sede');
    }

    // Agrupar materiales por materialId y sumar cantidades
    const materialesAgrupados = new Map<number, number>();
    inventarioTecnico.forEach(item => {
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
          materiales: [{
            materialId: materialId,
            movimientoCantidad: cantidadTotal,
          }],
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
      materialesTransferidos
    };
  }
}
