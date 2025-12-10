import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('items_proyecto')
export class ItemProyecto {
  @PrimaryGeneratedColumn()
  itemProyectoId: number;

  @Column()
  proyectoId: number;

  @Column()
  itemNombre: string;

  @Column({ nullable: true })
  itemCodigo: string;

  @Column({ type: 'text', nullable: true })
  itemDescripcion: string;

  @Column({ default: true })
  itemEstado: boolean;

  @Column({ nullable: true })
  usuarioRegistra: number;

  @ManyToOne('Proyecto', 'items')
  @JoinColumn({ name: 'proyectoId' })
  proyecto: any;

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

