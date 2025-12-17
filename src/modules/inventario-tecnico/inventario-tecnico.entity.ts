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

@Entity('inventario_tecnicos')
export class InventarioTecnico {
  @PrimaryGeneratedColumn()
  inventarioTecnicoId: number;

  @Column()
  usuarioId: number;

  @Column()
  materialId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cantidad: number;

  @ManyToOne('User', 'inventarioTecnico', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: any;

  @ManyToOne('Material', 'inventarioTecnico', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'materialId' })
  material: any;

  @OneToMany('NumeroMedidor', 'inventarioTecnico')
  numerosMedidor: any[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

