import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';

@Entity('materiales_bodegas')
@Unique(['materialId', 'bodegaId'])
export class MaterialBodega {
  @PrimaryGeneratedColumn()
  materialBodegaId: number;

  @Column()
  materialId: number;

  @Column()
  bodegaId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  stock: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  precioPromedio: number | null;

  @ManyToOne('Material', 'materialBodegas', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'materialId' })
  material: any;

  @ManyToOne('Bodega', 'materialBodegas', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bodegaId' })
  bodega: any;

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}
