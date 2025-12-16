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

@Entity('instalaciones_materiales')
export class InstalacionMaterial {
  @PrimaryGeneratedColumn()
  instalacionMaterialId: number;

  @Column()
  instalacionId: number;

  @Column()
  materialId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cantidad: number;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ type: 'boolean', nullable: true, default: null })
  materialAprobado: boolean | null; // null = pendiente, true = aprobado, false = desaprobado

  @ManyToOne('Instalacion', 'materialesUtilizados', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instalacionId' })
  instalacion: any;

  @ManyToOne('Material', 'instalacionesMateriales', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'materialId' })
  material: any;

  @OneToMany('NumeroMedidor', 'instalacionMaterial')
  numerosMedidor: any[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

