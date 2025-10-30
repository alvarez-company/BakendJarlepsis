import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum TipoMovimiento {
  ENTRADA = 'entrada',
  SALIDA = 'salida',
  DEVOLUCION = 'devolucion',
}

@Entity('movimientos_inventario')
export class MovimientoInventario {
  @PrimaryGeneratedColumn()
  movimientoId: number;

  @Column()
  materialId: number;

  @Column({
    type: 'enum',
    enum: TipoMovimiento,
  })
  movimientoTipo: TipoMovimiento;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  movimientoCantidad: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  movimientoPrecioUnitario: number;

  @Column({ type: 'text', nullable: true })
  movimientoObservaciones: string;

  @Column({ nullable: true })
  instalacionId: number;

  @ManyToOne('Instalacion', 'movimientos', { nullable: true })
  @JoinColumn({ name: 'instalacionId' })
  instalacion: any;

  @Column()
  usuarioId: number;

  @ManyToOne('User', 'movimientos')
  @JoinColumn({ name: 'usuarioId' })
  usuario: any;

  @Column({ nullable: true })
  proveedorId: number;

  @ManyToOne('Proveedor', 'movimientos', { nullable: true })
  @JoinColumn({ name: 'proveedorId' })
  proveedor: any;

  @Column({ default: true })
  movimientoEstado: boolean;

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

