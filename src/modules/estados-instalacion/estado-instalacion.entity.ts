import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Instalacion } from '../instalaciones/instalacion.entity';

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
