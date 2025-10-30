import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsuarioGrupo } from './usuario-grupo.entity';

@Injectable()
export class UsuariosGruposService {
  constructor(
    @InjectRepository(UsuarioGrupo)
    private usuariosGruposRepository: Repository<UsuarioGrupo>,
  ) {}

  async agregarUsuarioGrupo(grupoId: number, usuarioId: number): Promise<UsuarioGrupo> {
    const usuarioGrupo = this.usuariosGruposRepository.create({
      grupoId,
      usuarioId,
    });
    return this.usuariosGruposRepository.save(usuarioGrupo);
  }

  async agregarUsuariosGrupo(grupoId: number, usuariosId: number[]): Promise<UsuarioGrupo[]> {
    const usuariosGrupo = usuariosId.map(usuarioId => 
      this.usuariosGruposRepository.create({ grupoId, usuarioId })
    );
    return this.usuariosGruposRepository.save(usuariosGrupo);
  }

  async desasignarUsuario(grupoId: number, usuarioId: number): Promise<void> {
    const usuarioGrupo = await this.usuariosGruposRepository.findOne({ where: { grupoId, usuarioId } });
    if (usuarioGrupo) {
      usuarioGrupo.activo = false;
      await this.usuariosGruposRepository.save(usuarioGrupo);
    }
  }
}

