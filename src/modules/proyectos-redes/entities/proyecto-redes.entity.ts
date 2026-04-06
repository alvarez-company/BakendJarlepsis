import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ProyectoRedesActividad } from './proyecto-redes-actividad.entity';

@Entity('proyectos_redes')
export class ProyectoRedes {
  @PrimaryGeneratedColumn()
  proyectoRedesId: number;

  @Column({ unique: true, length: 24 })
  codigo: string;

  @Column({ length: 160 })
  nombre: string;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => ProyectoRedesActividad, (a) => a.proyectoRedes)
  actividades: ProyectoRedesActividad[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}
