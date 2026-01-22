import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReaccionMensaje } from './reaccion-mensaje.entity';

@Injectable()
export class ReaccionesMensajeService {
  constructor(
    @InjectRepository(ReaccionMensaje)
    private reaccionesRepository: Repository<ReaccionMensaje>,
  ) {}

  async agregarReaccion(
    mensajeId: number,
    usuarioId: number,
    tipoReaccion: string,
  ): Promise<ReaccionMensaje> {
    // Eliminar reacción anterior si existe
    await this.reaccionesRepository.delete({ mensajeId, usuarioId });

    const reaccion = this.reaccionesRepository.create({
      mensajeId,
      usuarioId,
      tipoReaccion,
    });
    return this.reaccionesRepository.save(reaccion);
  }

  async eliminarReaccion(mensajeId: number, usuarioId: number): Promise<void> {
    await this.reaccionesRepository.delete({ mensajeId, usuarioId });
  }

  async obtenerReaccionesMensaje(mensajeId: number): Promise<ReaccionMensaje[]> {
    return this.reaccionesRepository.find({
      where: { mensajeId },
      relations: ['usuario'],
    });
  }
}
