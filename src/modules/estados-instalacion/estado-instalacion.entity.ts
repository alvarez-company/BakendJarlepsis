import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('estados_instalacion')
export class EstadoInstalacionEntity {
  @PrimaryGeneratedColumn()
  estadoInstalacionId: number;

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
