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

@Entity('inventarios')
export class Inventario {
  @PrimaryGeneratedColumn()
  inventarioId: number;

  @Column()
  inventarioNombre: string;

  @Column({ type: 'text', nullable: true })
  inventarioDescripcion: string;

  @Column()
  bodegaId: number;

  @ManyToOne('Bodega', 'inventarios')
  @JoinColumn({ name: 'bodegaId' })
  bodega: any;

  @Column({ default: true })
  inventarioEstado: boolean;

  @OneToMany('Material', 'inventario')
  materiales: any[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

