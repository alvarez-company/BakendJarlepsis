import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum TipoEntidad {
  MOVIMIENTO = 'movimiento',
  INSTALACION = 'instalacion',
  TRASLADO = 'traslado',
  ASIGNACION = 'asignacion',
}

@Entity('auditoria_eliminaciones')
export class AuditoriaEliminacion {
  @PrimaryGeneratedColumn()
  auditoriaId: number;

  @Column({
    type: 'enum',
    enum: TipoEntidad,
  })
  tipoEntidad: TipoEntidad;

  @Column()
  entidadId: number;

  @Column({ type: 'json', nullable: true })
  datosEliminados: any; // Datos completos de la entidad antes de eliminarse

  @Column({ type: 'text', nullable: true })
  motivo: string;

  @Column()
  usuarioId: number;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @CreateDateColumn()
  fechaEliminacion: Date;
}

