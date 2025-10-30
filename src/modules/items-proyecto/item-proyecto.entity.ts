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
  materialId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  itemCantidad: number;

  @Column({ type: 'text', nullable: true })
  itemDescripcion: string;

  @Column({ default: true })
  itemEstado: boolean;

  @ManyToOne('Proyecto', 'items')
  @JoinColumn({ name: 'proyectoId' })
  proyecto: any;

  @ManyToOne('Material', 'itemsProyecto')
  @JoinColumn({ name: 'materialId' })
  material: any;

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

