import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoUsuario, EstadoEnum } from './estado-usuario.entity';

@Injectable()
export class EstadosUsuarioService {
  constructor(
    @InjectRepository(EstadoUsuario)
    private estadosRepository: Repository<EstadoUsuario>,
  ) {}

  async actualizarEstado(usuarioId: number, estado: EstadoEnum, mensajeEstado?: string): Promise<EstadoUsuario> {
    let estadoUsuario = await this.estadosRepository.findOne({ where: { usuarioId } });
    
    if (!estadoUsuario) {
      estadoUsuario = this.estadosRepository.create({ usuarioId, estado });
    } else {
      estadoUsuario.estado = estado;
      estadoUsuario.ultimaConexion = new Date();
    }
    
    if (mensajeEstado) {
      estadoUsuario.mensajeEstado = mensajeEstado;
    }
    
    return this.estadosRepository.save(estadoUsuario);
  }

  async obtenerEstado(usuarioId: number): Promise<EstadoUsuario> {
    return this.estadosRepository.findOne({ where: { usuarioId } });
  }

  async obtenerUsuariosEnLinea(): Promise<EstadoUsuario[]> {
    return this.estadosRepository.find({
      where: { estado: EstadoEnum.EN_LINEA },
      relations: ['usuario'],
    });
  }
}

