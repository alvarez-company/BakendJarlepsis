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

export enum TipoNotificacion {
  MENSAJE_NUEVO = 'mensaje_nuevo',
  REACCION_MENSAJE = 'reaccion_mensaje',
  INSTALACION_COMPLETADA = 'instalacion_completada',
  INSTALACION_ASIGNADA = 'instalacion_asignada',
  INSTALACION_EN_PROCESO = 'instalacion_en_proceso',
  INSTALACION_CANCELADA = 'instalacion_cancelada',
  INSTALACION_ASIGNACION = 'instalacion_asignacion',
  INSTALACION_CONSTRUCCION = 'instalacion_construccion',
  INSTALACION_CERTIFICACION = 'instalacion_certificacion',
  INSTALACION_NOVEDAD = 'instalacion_novedad',
  INSTALACION_ANULADA = 'instalacion_anulada',
  MENSAJE_RESPONDIDO = 'mensaje_respondido',
  USUARIO_INGRESO_GRUPO = 'usuario_ingreso_grupo',
  USUARIO_SALIO_GRUPO = 'usuario_salio_grupo',
  MATERIALES_ASIGNADOS = 'materiales_asignados',
}

@Entity('notificaciones')
@Index(['usuarioId', 'leida'])
@Index(['usuarioId', 'fechaCreacion'])
export class Notificacion {
  @PrimaryGeneratedColumn()
  notificacionId: number;

  @Column()
  usuarioId: number;

  @Column({
    type: 'enum',
    enum: TipoNotificacion,
  })
  tipoNotificacion: TipoNotificacion;

  @Column()
  titulo: string;

  @Column({ type: 'text' })
  contenido: string;

  @Column({ type: 'json', nullable: true })
  datosAdicionales: any;

  @Column({ nullable: true })
  grupoId: number;

  @Column({ nullable: true })
  instalacionId: number;

  @Column({ nullable: true })
  mensajeId: number;

  @Column({ default: false })
  leida: boolean;

  @Column({ type: 'datetime', nullable: true })
  fechaLectura: Date;

  @ManyToOne('User', 'notificaciones')
  @JoinColumn({ name: 'usuarioId' })
  usuario: any;

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

