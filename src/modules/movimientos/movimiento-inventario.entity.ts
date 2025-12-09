import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EstadoMovimientoEntity } from '../estados-movimiento/estado-movimiento.entity';

export enum TipoMovimiento {
  ENTRADA = 'entrada',
  SALIDA = 'salida',
  DEVOLUCION = 'devolucion',
}

export enum EstadoMovimiento {
  PENDIENTE = 'pendiente',
  COMPLETADA = 'completada',
  CANCELADA = 'cancelada',
}

@Entity('movimientos_inventario')
export class MovimientoInventario {
  @PrimaryGeneratedColumn()
  movimientoId: number;

  @Column()
  materialId: number;

  // Relación comentada temporalmente para evitar problemas
  // @ManyToOne('Material', 'movimientos', { nullable: false })
  // @JoinColumn({ name: 'materialId' })
  // material: any;

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

  @Column({ nullable: true })
  inventarioId: number;

  @ManyToOne('Inventario', 'movimientos', { nullable: true })
  @JoinColumn({ name: 'inventarioId' })
  inventario: any;

  // bodegaId y bodega comentados porque la columna no existe en la BD
  // La bodega se obtiene a través del inventario
  // @Column({ nullable: true })
  // bodegaId: number;

  // @ManyToOne('Bodega', 'movimientos', { nullable: true })
  // @JoinColumn({ name: 'bodegaId' })
  // bodega: any;

  @Column({ nullable: true })
  movimientoCodigo: string; // Código para agrupar múltiples movimientos

  @Column({ nullable: true, unique: true })
  identificadorUnico: string; // SAL-1, ENT-1, DEV-1, etc.

  // oficinaId eliminado - las bodegas ahora pertenecen directamente a sedes
  // Se mantiene la columna en BD por compatibilidad con datos históricos, pero no se usa

  @Column({
    type: 'enum',
    enum: EstadoMovimiento,
    default: EstadoMovimiento.COMPLETADA, // Por defecto completada para mantener compatibilidad
  })
  movimientoEstado: EstadoMovimiento; // Mantener por compatibilidad

  @Column({ nullable: true })
  estadoMovimientoId: number;

  @ManyToOne(() => EstadoMovimientoEntity, { nullable: true })
  @JoinColumn({ name: 'estadoMovimientoId' })
  estadoMovimiento: EstadoMovimientoEntity;

  @Column({ nullable: true })
  tecnicoOrigenId: number;

  @ManyToOne('User', 'movimientosOrigen', { nullable: true })
  @JoinColumn({ name: 'tecnicoOrigenId' })
  tecnicoOrigen: any;

  @Column({ type: 'enum', enum: ['bodega', 'tecnico'], nullable: true })
  origenTipo: 'bodega' | 'tecnico';

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

