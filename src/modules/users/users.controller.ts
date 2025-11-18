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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';
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
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Create a new user (Admin/SuperAdmin only)' })
  create(@Body() createUserDto: CreateUserDto, @Request() req) {
    return this.usersService.create(createUserDto, req.user.usuarioId);
  }

  @Get()
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(@Query() paginationDto: PaginationDto, @Query('search') search?: string) {
    return this.usersService.findAll(paginationDto, search);
  }

  @Get(':id')
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Get a user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Update a user (Admin/SuperAdmin only)' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Patch(':id/estado')
  @Roles('superadmin', 'admin')
  @ApiOperation({ summary: 'Update user status (Admin/SuperAdmin only)' })
  updateEstado(@Param('id') id: string, @Body() updateEstadoDto: UpdateEstadoDto) {
    return this.usersService.updateEstado(+id, updateEstadoDto.usuarioEstado);
  }

  @Post(':id/change-role')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Change user role (SuperAdmin only)' })
  changeRole(@Param('id') id: string, @Body() changeRoleDto: ChangeRoleDto) {
    return this.usersService.changeRole(+id, changeRoleDto.usuarioRolId);
  }

  @Delete(':id')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Delete a user' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
