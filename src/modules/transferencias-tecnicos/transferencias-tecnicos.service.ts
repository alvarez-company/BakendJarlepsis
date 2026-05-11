import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransferenciaTecnico } from './transferencia-tecnico.entity';
import { InventarioTecnicoService } from '../inventario-tecnico/inventario-tecnico.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { TipoEntidad } from '../auditoria/auditoria.entity';

@Injectable()
export class TransferenciasTecnicosService {
  constructor(
    @InjectRepository(TransferenciaTecnico)
    private repo: Repository<TransferenciaTecnico>,
    @Inject(forwardRef(() => InventarioTecnicoService))
    private inventarioTecnicoService: InventarioTecnicoService,
    private auditoriaService: AuditoriaService,
  ) {}

  async create(record: Omit<TransferenciaTecnico, 'transferenciaTecnicoId' | 'fechaCreacion'>) {
    const exists = await this.repo.findOne({ where: { codigo: record.codigo } });
    if (exists) throw new BadRequestException('Código de transferencia ya existe');
    return this.repo.save(this.repo.create(record as any));
  }

  async findByCodigo(codigo: string) {
    const row = await this.repo.findOne({ where: { codigo } });
    return row;
  }

  async removeByCodigo(codigo: string, usuarioId: number, requestingUser?: any) {
    const row = await this.repo.findOne({ where: { codigo } });
    if (!row) throw new NotFoundException('Transferencia entre técnicos no encontrada');

    await this.auditoriaService.registrarEliminacion(
      TipoEntidad.ASIGNACION,
      row.transferenciaTecnicoId,
      row,
      usuarioId,
      'reversion_transferencia_tecnico',
      'Se eliminó la transferencia técnico↔técnico y se revirtieron los stocks.',
    );

    // Revertir la operación: destino → origen (mismos materiales/números)
    await this.inventarioTecnicoService.transferirMaterialesEntreTecnicos(
      row.usuarioDestinoId,
      {
        usuarioDestinoId: row.usuarioOrigenId,
        materiales: row.materiales,
        usuarioAsignadorId: usuarioId,
        numeroOrden: row.numeroOrden || undefined,
        observaciones: `Reversión de transferencia ${row.codigo}`,
      } as any,
      requestingUser,
    );

    await this.repo.remove(row);
    return { success: true };
  }
}
