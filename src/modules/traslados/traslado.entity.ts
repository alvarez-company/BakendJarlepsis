import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum EstadoTraslado {
  PENDIENTE = 'pendiente',
  EN_TRANSITO = 'en_transito',
  COMPLETADO = 'completado',
  CANCELADO = 'cancelado',
}

@Entity('traslados')
export class Traslado {
  @PrimaryGeneratedColumn()
  trasladoId: number;

  @Column()
  materialId: number;

  @Column()
  bodegaOrigenId: number;

  @Column()
  bodegaDestinoId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  trasladoCantidad: number;

  @Column({
    type: 'enum',
    enum: EstadoTraslado,
    default: EstadoTraslado.PENDIENTE,
  })
  trasladoEstado: EstadoTraslado;

  @Column({ type: 'text', nullable: true })
  trasladoObservaciones: string;

  @Column()
  usuarioId: number;

  @ManyToOne('User', 'traslados')
  @JoinColumn({ name: 'usuarioId' })
  usuario: any;

  @ManyToOne('Material', 'traslados')
  @JoinColumn({ name: 'materialId' })
  material: any;

  @ManyToOne('Bodega', 'trasladosOrigen')
  @JoinColumn({ name: 'bodegaOrigenId' })
  bodegaOrigen: any;

  @ManyToOne('Bodega', 'trasladosDestino')
  @JoinColumn({ name: 'bodegaDestinoId' })
  bodegaDestino: any;

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

