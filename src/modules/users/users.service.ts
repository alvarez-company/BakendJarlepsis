import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
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
    if (userData.usuarioOficina === 0) {
      userData.usuarioOficina = null;
    }
    
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async findAll(paginationDto?: PaginationDto, search?: string): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const page = paginationDto?.page || 1;
    const limit = paginationDto?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.usuarioRol', 'rol')
      .leftJoinAndSelect('user.sede', 'sede')
      .leftJoinAndSelect('user.oficina', 'oficina')
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
      relations: ['usuarioRol', 'sede', 'oficina', 'bodega'],
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
    if (updateUserDto.usuarioOficina === 0) {
      updateUserDto.usuarioOficina = null;
    }

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async changeRole(id: number, newRoleId: number): Promise<User> {
    const user = await this.findOne(id);
    user.usuarioRolId = newRoleId;
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
}
