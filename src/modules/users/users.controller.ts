import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { UpdateEstadoUsuarioDto } from './dto/update-estado.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ImpersonationGuard } from '../auth/guards/impersonation.guard';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, ImpersonationGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('superadmin', 'gerencia', 'admin', 'admin-internas', 'admin-redes')
  @ApiOperation({ summary: 'Create a new user' })
  create(@Body() createUserDto: CreateUserDto, @Request() req) {
    const rolTipo = req.user.usuarioRol?.rolTipo || req.user.role;
    return this.usersService.create(createUserDto, req.user.usuarioId, rolTipo);
  }

  // Endpoints para el usuario actual (sin restricción de roles) - DEBEN IR ANTES de las rutas genéricas
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMyProfile(@Request() req) {
    if (!req.user || !req.user.usuarioId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    const user = await this.usersService.findOne(req.user.usuarioId);
    // Remover la contraseña de la respuesta
    const { usuarioContrasena: _usuarioContrasena, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Patch('me/profile')
  @ApiOperation({ summary: 'Update current user profile' })
  updateMyProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    if (!req.user || !req.user.usuarioId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.usersService.updateMyProfile(req.user.usuarioId, updateUserDto);
  }

  @Patch('me/change-password')
  @ApiOperation({ summary: 'Change current user password' })
  changeMyPassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    if (!req.user || !req.user.usuarioId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.usersService.changePassword(req.user.usuarioId, changePasswordDto);
  }

  @Get()
  @Roles(
    'superadmin',
    'gerencia',
    'admin',
    'admin-internas',
    'admin-redes',
    'bodega-internas',
    'bodega-redes',
  )
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query('search') search?: string,
    @Request() req?: { user?: any },
  ) {
    return this.usersService.findAll(paginationDto, search, req?.user);
  }

  @Get('tecnicos-mi-centro')
  @Roles('almacenista')
  @ApiOperation({
    summary:
      'Listar técnicos del mismo centro operativo (almacenista). Solo lectura: ver inventario vía inventario-tecnico/usuario/:usuarioId',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findTecnicosMiCentro(
    @Query() paginationDto: PaginationDto,
    @Query('search') search: string | undefined,
    @Request() req: { user: any },
  ) {
    // Obtener sedeId de múltiples formas posibles para soportar impersonación
    // El campo usuarioSede debería estar disponible directamente en la entidad
    // Si no está, intentar obtenerlo desde la relación sede
    let sedeId = req.user?.usuarioSede;
    
    // Si no está disponible directamente, intentar desde la relación
    if (!sedeId && req.user?.sede) {
      sedeId = req.user.sede.sedeId;
    }
    
    // Si aún no hay sedeId válido, retornar array vacío
    // Esto puede ocurrir si el almacenista no tiene sede asignada
    if (!sedeId || sedeId === 0) {
      return { data: [], total: 0, page: 1, limit: paginationDto?.limit ?? 10 };
    }
    
    return this.usersService.findTecnicosBySede(sedeId, paginationDto, search);
  }

  @Get(':id')
  @Roles(
    'superadmin',
    'gerencia',
    'admin',
    'admin-internas',
    'admin-redes',
    'almacenista',
    'bodega-internas',
    'bodega-redes',
  )
  @ApiOperation({ summary: 'Get a user by ID (almacenista solo ve usuarios de su centro, p. ej. técnicos)' })
  findOne(@Param('id') id: string, @Request() req?: { user?: any }) {
    return this.usersService.findOne(+id, req?.user);
  }

  // Rutas específicas deben ir ANTES de las rutas genéricas
  @Patch(':id/cancelar-contrato')
  @Roles('superadmin', 'gerencia', 'admin')
  @ApiOperation({ summary: 'Cancelar contrato de técnico y transferir materiales a la sede' })
  cancelarContrato(@Param('id') id: string, @Request() req) {
    return this.usersService.cancelarContrato(+id, req.user.usuarioId);
  }

  @Patch(':id/estado')
  @Roles('superadmin', 'gerencia', 'admin')
  @ApiOperation({ summary: 'Update user status (SuperAdmin/Gerencia/Admin only)' })
  updateEstado(@Param('id') id: string, @Body() updateEstadoDto: UpdateEstadoUsuarioDto) {
    return this.usersService.updateEstado(+id, updateEstadoDto.usuarioEstado);
  }

  @Post(':id/change-role')
  @Roles('superadmin', 'gerencia')
  @ApiOperation({
    summary:
      'Change user role (SuperAdmin o Gerencia). No se puede asignar rol Super Administrador.',
  })
  changeRole(@Param('id') id: string, @Body() changeRoleDto: ChangeRoleDto) {
    return this.usersService.changeRole(+id, changeRoleDto.usuarioRolId);
  }

  @Patch(':id')
  @Roles(
    'superadmin',
    'gerencia',
    'admin',
    'admin-internas',
    'admin-redes',
    'bodega-internas',
    'bodega-redes',
  )
  @ApiOperation({ summary: 'Update a user' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req) {
    const rolTipo = req.user.usuarioRol?.rolTipo || req.user.role;
    return this.usersService.update(+id, updateUserDto, req.user.usuarioId, rolTipo);
  }

  @Delete(':id')
  @Roles('superadmin', 'gerencia')
  @ApiOperation({ summary: 'Delete a user (no se puede eliminar el usuario Super Administrador)' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
