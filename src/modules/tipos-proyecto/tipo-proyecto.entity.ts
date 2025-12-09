import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('tipos_proyecto')
export class TipoProyecto {
  @PrimaryGeneratedColumn()
  tipoProyectoId: number;

  @Column()
  tipoProyectoNombre: string;

  @Column({ type: 'text', nullable: true })
  tipoProyectoDescripcion: string;

  @Column({ default: true })
  tipoProyectoEstado: boolean;

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

