import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InstalacionUsuario } from './instalacion-usuario.entity';
import { CreateInstalacionUsuarioDto } from './dto/create-instalacion-usuario.dto';

@Injectable()
export class InstalacionesUsuariosService {
  constructor(
    @InjectRepository(InstalacionUsuario)
    private instalacionesUsuariosRepository: Repository<InstalacionUsuario>,
  ) {}

  async create(createDto: CreateInstalacionUsuarioDto): Promise<InstalacionUsuario> {
    const asignacion = this.instalacionesUsuariosRepository.create(createDto);
    return this.instalacionesUsuariosRepository.save(asignacion);
  }

  async asignarUsuarios(instalacionId: number, usuarios: { usuarioId: number; rolEnInstalacion: string }[]): Promise<InstalacionUsuario[]> {
    const asignaciones = [];
    for (const usuario of usuarios) {
      const asignacion = this.instalacionesUsuariosRepository.create({
        instalacionId,
        usuarioId: usuario.usuarioId,
        rolEnInstalacion: usuario.rolEnInstalacion,
      });
      asignaciones.push(await this.instalacionesUsuariosRepository.save(asignacion));
    }
    return asignaciones;
  }

  async findByInstalacion(instalacionId: number): Promise<InstalacionUsuario[]> {
    return this.instalacionesUsuariosRepository.find({
      where: { instalacionId, activo: true },
      relations: ['usuario'],
    });
  }

  async findByUsuario(usuarioId: number): Promise<InstalacionUsuario[]> {
    return this.instalacionesUsuariosRepository.find({
      where: { usuarioId, activo: true },
      relations: ['instalacion'],
    });
  }

  async remove(instalacionUsuarioId: number): Promise<void> {
    const asignacion = await this.instalacionesUsuariosRepository.findOne({
      where: { instalacionUsuarioId },
    });
    if (!asignacion) {
      throw new NotFoundException(`Asignación con ID ${instalacionUsuarioId} no encontrada`);
    }
    asignacion.activo = false;
    await this.instalacionesUsuariosRepository.save(asignacion);
  }

  async desasignarUsuarios(instalacionId: number): Promise<void> {
    const asignaciones = await this.findByInstalacion(instalacionId);
    for (const asignacion of asignaciones) {
      asignacion.activo = false;
      await this.instalacionesUsuariosRepository.save(asignacion);
    }
  }
}

