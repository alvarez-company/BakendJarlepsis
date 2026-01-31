import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

export enum EstadoNumeroMedidor {
  DISPONIBLE = 'disponible',
  ASIGNADO_TECNICO = 'asignado_tecnico',
  EN_INSTALACION = 'en_instalacion',
  INSTALADO = 'instalado',
}

@Entity('numeros_medidor')
export class NumeroMedidor {
  @PrimaryGeneratedColumn()
  numeroMedidorId: number;

  @Column()
  materialId: number;

  @Column({ unique: true })
  @Index('idx_numero_medidor_unico', { unique: true })
  numeroMedidor: string; // Número único del medidor

  @Column({
    type: 'enum',
    enum: EstadoNumeroMedidor,
    default: EstadoNumeroMedidor.DISPONIBLE,
  })
  estado: EstadoNumeroMedidor;

  @Column({ nullable: true })
  inventarioTecnicoId: number; // Si está asignado a un técnico

  @Column({ nullable: true })
  instalacionMaterialId: number; // Si está en una instalación

  @Column({ nullable: true })
  usuarioId: number; // Técnico al que está asignado (redundante pero útil para consultas)

  @Column({ nullable: true })
  instalacionId: number; // Instalación donde está (redundante pero útil para consultas)

  @Column({ nullable: true })
  bodegaId: number; // Bodega donde queda el medidor; si es null, queda en el centro operativo (sede)

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @ManyToOne('Material', 'numerosMedidor', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'materialId' })
  material: any;

  @ManyToOne('InventarioTecnico', 'numerosMedidor', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'inventarioTecnicoId' })
  inventarioTecnico: any;

  @ManyToOne('InstalacionMaterial', 'numerosMedidor', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'instalacionMaterialId' })
  instalacionMaterial: any;

  @ManyToOne('User', 'numerosMedidor', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: any;

  @ManyToOne('Bodega', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'bodegaId' })
  bodega: any;

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}
