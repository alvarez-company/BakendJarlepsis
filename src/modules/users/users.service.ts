import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto, creadorId?: number): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.usuarioContrasena, 10);
    const user = this.usersRepository.create({
      ...createUserDto,
      usuarioContrasena: hashedPassword,
      usuarioCreador: creadorId,
    });
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      relations: ['usuarioRol', 'sede', 'oficina', 'bodega'],
    });
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
    if (updateUserDto.usuarioContrasena) {
      updateUserDto.usuarioContrasena = await bcrypt.hash(updateUserDto.usuarioContrasena, 10);
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
