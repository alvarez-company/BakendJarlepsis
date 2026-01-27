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

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('superadmin', 'admin', 'administrador')
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
    const { usuarioContrasena, ...userWithoutPassword } = user;
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
  @Roles('superadmin', 'admin', 'administrador', 'bodega-internas', 'bodega-redes')
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(@Query() paginationDto: PaginationDto, @Query('search') search?: string) {
    return this.usersService.findAll(paginationDto, search);
  }

  @Get(':id')
  @Roles('superadmin', 'admin', 'administrador', 'bodega-internas', 'bodega-redes')
  @ApiOperation({ summary: 'Get a user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  // Rutas específicas deben ir ANTES de las rutas genéricas
  @Patch(':id/cancelar-contrato')
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Cancelar contrato de técnico y transferir materiales a la sede' })
  cancelarContrato(@Param('id') id: string, @Request() req) {
    return this.usersService.cancelarContrato(+id, req.user.usuarioId);
  }

  @Patch(':id/estado')
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Update user status (Admin/SuperAdmin only)' })
  updateEstado(@Param('id') id: string, @Body() updateEstadoDto: UpdateEstadoUsuarioDto) {
    return this.usersService.updateEstado(+id, updateEstadoDto.usuarioEstado);
  }

  @Post(':id/change-role')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Change user role (SuperAdmin only)' })
  changeRole(@Param('id') id: string, @Body() changeRoleDto: ChangeRoleDto) {
    return this.usersService.changeRole(+id, changeRoleDto.usuarioRolId);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin', 'bodega-internas', 'bodega-redes')
  @ApiOperation({ summary: 'Update a user' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req) {
    const rolTipo = req.user.usuarioRol?.rolTipo || req.user.role;
    return this.usersService.update(+id, updateUserDto, req.user.usuarioId, rolTipo);
  }

  @Delete(':id')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Delete a user' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
