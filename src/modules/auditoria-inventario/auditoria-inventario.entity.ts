import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum TipoCambioInventario {
  CREACION_MATERIAL = 'creacion_material',
  ACTUALIZACION_MATERIAL = 'actualizacion_material',
  ELIMINACION_MATERIAL = 'eliminacion_material',
  AJUSTE_STOCK = 'ajuste_stock',
  DISTRIBUCION_BODEGA = 'distribucion_bodega',
  MOVIMIENTO_ENTRADA = 'movimiento_entrada',
  MOVIMIENTO_SALIDA = 'movimiento_salida',
  MOVIMIENTO_DEVOLUCION = 'movimiento_devolucion',
  TRASLADO = 'traslado',
  CAMBIO_ESTADO = 'cambio_estado',
}

@Entity('auditoria_inventario')
export class AuditoriaInventario {
  @PrimaryGeneratedColumn()
  auditoriaId: number;

  @Column()
  materialId: number;

  @ManyToOne('Material', { nullable: true })
  @JoinColumn({ name: 'materialId' })
  material: any;

  @Column({
    type: 'enum',
    enum: TipoCambioInventario,
  })
  tipoCambio: TipoCambioInventario;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'json', nullable: true })
  datosAnteriores: any; // Datos antes del cambio

  @Column({ type: 'json', nullable: true })
  datosNuevos: any; // Datos después del cambio

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cantidadAnterior: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cantidadNueva: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  diferencia: number;

  @Column({ nullable: true })
  bodegaId: number;

  @ManyToOne('Bodega', { nullable: true })
  @JoinColumn({ name: 'bodegaId' })
  bodega: any;

  @Column()
  usuarioId: number;

  @ManyToOne('User', 'auditoriaInventario')
  @JoinColumn({ name: 'usuarioId' })
  usuario: any;

  @Column({ nullable: true })
  movimientoId: number;

  @Column({ nullable: true })
  trasladoId: number;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @CreateDateColumn()
  fechaCreacion: Date;
}
