import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProyectoRedes } from './proyecto-redes.entity';

@Entity('proyectos_redes_actividades')
export class ProyectoRedesActividad {
  @PrimaryGeneratedColumn()
  actividadId: number;

  @Column()
  proyectoRedesId: number;

  @ManyToOne(() => ProyectoRedes, (p) => p.actividades, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'proyectoRedesId' })
  proyectoRedes: ProyectoRedes;

  @Column({ length: 255 })
  nombre: string;

  @Column({ default: 0 })
  orden: number;

  @Column({ default: true })
  activo: boolean;

  @Column({ nullable: true })
  usuarioRegistra: number;

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}
