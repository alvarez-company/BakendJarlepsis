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

  @Column({ default: true })
  proyectoEstado: boolean;

  @Column({ nullable: true })
  usuarioRegistra: number;

  @OneToMany('ItemProyecto', 'proyecto')
  items: any[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}
