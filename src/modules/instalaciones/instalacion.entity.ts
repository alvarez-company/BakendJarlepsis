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
  /** Asignada por Metrogas */
  APM = 'apm',
  /** Pendiente por construir */
  PPC = 'ppc',
  /** Asignada al técnico */
  AAT = 'aat',
  /** Avance (obra en ejecución) */
  AVAN = 'avan',
  /** Construida */
  CONS = 'cons',
  /** Certificada */
  CERT = 'cert',
  /** Facturación (cierra ciclo operativo) */
  FACT = 'fact',
  /** Novedad */
  NOVE = 'nove',
  /** Devuelta (reemplaza el antiguo estado anulada) */
  DEV = 'dev',
  /** Legacy — normalizar al persistir / API */
  PENDIENTE = 'pendiente',
  NOVEDAD = 'novedad',
  ASIGNACION = 'asignacion',
  CONSTRUCCION = 'construccion',
  CERTIFICACION = 'certificacion',
  COMPLETADA = 'completada',
  EN_PROCESO = 'en_proceso',
  FINALIZADA = 'finalizada',
  CANCELADA = 'cancelada',
}

@Entity('instalaciones')
export class Instalacion {
  @PrimaryGeneratedColumn()
  instalacionId: number;

  @Column({ nullable: true, unique: true })
  identificadorUnico: string; // INST-1, INST-2, etc.

  @Column({ nullable: true })
  instalacionCodigo: string | null; // Código de instalación (opcional; en redes no siempre hay código)

  @Column({ nullable: true })
  tipoInstalacionId: number | null;

  /** Tipo de instalación: 'internas' | 'redes'. Define si la instalación es de internas o de redes. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  instalacionTipo: 'internas' | 'redes' | null;

  @Column()
  clienteId: number;

  @Column({ nullable: true })
  instalacionMedidorNumero: string;

  @Column({ nullable: true })
  instalacionSelloNumero: string;

  @Column({ nullable: true })
  instalacionSelloRegulador: string;

  @Column({ type: 'date', nullable: true })
  instalacionFecha: Date; // Opcional

  @Column({ type: 'date', nullable: true })
  fechaAsignacionMetrogas: Date | null; // Opcional

  // Fechas de estados legacy
  @Column({ type: 'datetime', nullable: true })
  fechaAsignacion: Date;

  @Column({ type: 'datetime', nullable: true })
  fechaConstruccion: Date;

  /** Obra lista (construcción terminada). */
  @Column({ type: 'datetime', nullable: true })
  fechaConstruida: Date;

  @Column({ type: 'datetime', nullable: true })
  fechaCertificacion: Date;

  @Column({ type: 'datetime', nullable: true })
  fechaFacturacion: Date;

  @Column({ type: 'datetime', nullable: true })
  fechaAnulacion: Date;

  @Column({ type: 'datetime', nullable: true })
  fechaNovedad: Date;

  @Column({ type: 'datetime', nullable: true })
  fechaFinalizacion: Date;

  @Column({ type: 'datetime', nullable: true })
  fechaDevolucion: Date;

  /** Número de acta al pasar a facturación. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  instalacionNumeroActa: string | null;

  /** Motivo / detalle cuando el estado es novedad. */
  @Column({ type: 'text', nullable: true })
  observacionNovedad: string | null;

  @Column({ type: 'json', nullable: true })
  materialesInstalados: any;

  @Column({ type: 'json', nullable: true })
  instalacionProyectos: any;

  @Column({ type: 'text', nullable: true })
  instalacionObservaciones: string; // Observaciones generales

  @Column({ type: 'text', nullable: true })
  observacionesTecnico: string; // Observaciones específicas del técnico

  /** URLs de fotos/archivos subidos en el chat de la instalación (anexos). */
  @Column({ type: 'json', nullable: true })
  instalacionAnexos: string[] | null;

  /** PDF de anexo (data URL base64 o URL legada /public/...); opcional en cualquier estado. */
  @Column({ type: 'longtext', nullable: true })
  anexoPdf: string | null;

  @Column({ type: 'varchar', length: 32, default: EstadoInstalacion.APM })
  estado: EstadoInstalacion;

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
