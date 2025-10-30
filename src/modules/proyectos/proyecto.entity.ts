import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

@Entity('proyectos')
export class Proyecto {
  @PrimaryGeneratedColumn()
  proyectoId: number;

  @Column()
  proyectoNombre: string;

  @Column({ type: 'text', nullable: true })
  proyectoDescripcion: string;

  @Column({ nullable: true })
  proyectoCodigo: string;

  @Column()
  tipoProyectoId: number;

  @ManyToOne('TipoProyecto', 'proyectos')
  @JoinColumn({ name: 'tipoProyectoId' })
  tipoProyecto: any;

  @Column({ default: true })
  proyectoEstado: boolean;

  @OneToMany('ItemProyecto', 'proyecto')
  items: any[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

