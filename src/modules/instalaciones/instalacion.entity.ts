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
import { EstadoInstalacionEntity } from '../estados-instalacion/estado-instalacion.entity';

export enum EstadoInstalacion {
  PENDIENTE = 'pendiente',
  EN_PROCESO = 'en_proceso',
  COMPLETADA = 'completada',
  FINALIZADA = 'finalizada',
  CANCELADA = 'cancelada',
  // Valores legacy (mantener por compatibilidad)
  ASIGNACION = 'asignacion',
  CONSTRUCCION = 'construccion',
  CERTIFICACION = 'certificacion',
  NOVEDAD = 'novedad',
  ANULADA = 'anulada',
}

@Entity('instalaciones')
export class Instalacion {
  @PrimaryGeneratedColumn()
  instalacionId: number;

  @Column({ nullable: true, unique: true })
  identificadorUnico: string; // INST-1, INST-2, etc.

  @Column()
  instalacionCodigo: string; // Código de instalación (obligatorio)

  @Column()
  tipoInstalacionId: number;

  @Column()
  clienteId: number;

  @Column({ nullable: true })
  instalacionMedidorNumero: string;

  @Column({ nullable: true })
  instalacionSelloNumero: string;

  @Column({ nullable: true })
  instalacionSelloRegulador: string;

  @Column({ type: 'date', nullable: true })
  instalacionFecha: Date;

  @Column({ type: 'date', nullable: true })
  fechaAsignacionMetrogas: Date;

  // Fechas de estados legacy
  @Column({ type: 'datetime', nullable: true })
  fechaAsignacion: Date;

  @Column({ type: 'datetime', nullable: true })
  fechaConstruccion: Date;

  @Column({ type: 'datetime', nullable: true })
  fechaCertificacion: Date;

  @Column({ type: 'datetime', nullable: true })
  fechaAnulacion: Date;

  @Column({ type: 'datetime', nullable: true })
  fechaNovedad: Date;

  @Column({ type: 'datetime', nullable: true })
  fechaFinalizacion: Date;

  @Column({ type: 'json', nullable: true })
  materialesInstalados: any;

  @Column({ type: 'json', nullable: true })
  instalacionProyectos: any;

  @Column({ type: 'text', nullable: true })
  instalacionObservaciones: string; // Observaciones generales

  @Column({ type: 'text', nullable: true })
  observacionesTecnico: string; // Observaciones específicas del técnico

  @Column({
    type: 'enum',
    enum: EstadoInstalacion,
    default: EstadoInstalacion.PENDIENTE,
  })
  estado: EstadoInstalacion; // Mantener por compatibilidad

  @Column({ nullable: true })
  estadoInstalacionId: number;

  @ManyToOne(() => EstadoInstalacionEntity, { nullable: true })
  @JoinColumn({ name: 'estadoInstalacionId' })
  estadoInstalacion: EstadoInstalacionEntity;

  @Column()
  usuarioRegistra: number;

  @Column({ nullable: true })
  bodegaId: number;

  @ManyToOne('TipoInstalacion', 'instalaciones')
  @JoinColumn({ name: 'tipoInstalacionId' })
  tipoInstalacion: any;

  // Comentado temporalmente para evitar que TypeORM intente cargar automáticamente la relación
  // que causa errores con clienteCodigo. Los clientes se cargan manualmente en el servicio.
  // @ManyToOne('Cliente', 'instalaciones')
  // @JoinColumn({ name: 'clienteId' })
  cliente: any;

  @OneToMany('MovimientoInventario', 'instalacion')
  movimientos: any[];

  @OneToMany('InstalacionUsuario', 'instalacion')
  usuariosAsignados: any[];

  @OneToMany('InstalacionMaterial', 'instalacion')
  materialesUtilizados: any[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}
