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
    // Verificar si ya existe una relación (activa o inactiva)
    const existente = await this.usuariosGruposRepository.findOne({ 
      where: { grupoId, usuarioId } 
    });
    
    if (existente) {
      // Si existe pero está inactiva, reactivarla
      if (!existente.activo) {
        existente.activo = true;
        return this.usuariosGruposRepository.save(existente);
      }
      // Si ya está activa, retornar la existente
      return existente;
    }
    
    // Si no existe, crear nueva relación
    const usuarioGrupo = this.usuariosGruposRepository.create({
      grupoId,
      usuarioId,
      activo: true,
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

  async obtenerUsuariosGrupo(grupoId: number): Promise<UsuarioGrupo[]> {
    try {
      return await this.usuariosGruposRepository.find({ 
        where: { grupoId, activo: true },
        relations: ['usuario'],
      });
    } catch (error) {
      console.error(`[UsuariosGruposService] Error al obtener usuarios del grupo ${grupoId}:`, error);
      // Si hay un error con las relaciones, intentar sin relaciones
      try {
        return await this.usuariosGruposRepository.find({ 
          where: { grupoId, activo: true },
        });
      } catch (fallbackError) {
        console.error(`[UsuariosGruposService] Error en fallback al obtener usuarios del grupo ${grupoId}:`, fallbackError);
        throw fallbackError;
      }
    }
  }
}

