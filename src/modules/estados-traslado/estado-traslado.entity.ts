import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('estados_traslado')
export class EstadoTrasladoEntity {
  @PrimaryGeneratedColumn()
  estadoTrasladoId: number;

  @Column({ unique: true, length: 50 })
  estadoCodigo: string;

  @Column({ length: 100 })
  estadoNombre: string;

  @Column({ type: 'text', nullable: true })
  estadoDescripcion: string | null;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

