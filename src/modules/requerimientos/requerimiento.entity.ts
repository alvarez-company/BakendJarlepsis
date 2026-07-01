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

export enum TipoRequerimiento {
  DESARROLLO = 'desarrollo',
  BUG = 'bug',
  MEJORA = 'mejora',
  CONSULTA = 'consulta',
  INTERNO_ADMIN = 'interno_admin',
  INTERNO_GERENCIA = 'interno_gerencia',
}

export enum EstadoRequerimiento {
  PENDIENTE = 'pendiente',
  EN_REVISION = 'en_revision',
  EN_PROGRESO = 'en_progreso',
  EN_PRUEBAS = 'en_pruebas',
  COMPLETADO = 'completado',
  RECHAZADO = 'rechazado',
  CANCELADO = 'cancelado',
}

export enum PrioridadRequerimiento {
  BAJA = 'baja',
  MEDIA = 'media',
  ALTA = 'alta',
  CRITICA = 'critica',
}

export enum CategoriaRequerimiento {
  INVENTARIO = 'inventario',
  INSTALACIONES = 'instalaciones',
  USUARIOS = 'usuarios',
  REPORTES = 'reportes',
  CHAT = 'chat',
  MEDIDORES = 'medidores',
  GENERAL = 'general',
  OTRO = 'otro',
}

@Entity('requerimientos')
@Index(['estado', 'prioridad'])
@Index(['solicitanteId', 'fechaCreacion'])
@Index(['asignadoId', 'estado'])
@Index(['tipo', 'estado'])
export class Requerimiento {
  @PrimaryGeneratedColumn()
  requerimientoId: number;

  @Column({ length: 20, unique: true })
  codigo: string;

  @Column({ length: 200 })
  titulo: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({
    type: 'enum',
    enum: TipoRequerimiento,
    default: TipoRequerimiento.CONSULTA,
  })
  tipo: TipoRequerimiento;

  @Column({
    type: 'enum',
    enum: EstadoRequerimiento,
    default: EstadoRequerimiento.PENDIENTE,
  })
  estado: EstadoRequerimiento;

  @Column({
    type: 'enum',
    enum: PrioridadRequerimiento,
    default: PrioridadRequerimiento.MEDIA,
  })
  prioridad: PrioridadRequerimiento;

  @Column({
    type: 'enum',
    enum: CategoriaRequerimiento,
    default: CategoriaRequerimiento.GENERAL,
  })
  categoria: CategoriaRequerimiento;

  @Column()
  solicitanteId: number;

  @ManyToOne('User', { nullable: false })
  @JoinColumn({ name: 'solicitanteId' })
  solicitante: any;

  @Column({ nullable: true })
  asignadoId: number;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'asignadoId' })
  asignado: any;

  @Column({ nullable: true })
  sedeId: number;

  @ManyToOne('Sede', { nullable: true })
  @JoinColumn({ name: 'sedeId' })
  sede: any;

  @Column({ type: 'text', nullable: true })
  respuesta: string;

  @Column({ type: 'text', nullable: true })
  notasInternas: string;

  @Column({ type: 'json', nullable: true })
  archivosAdjuntos: string[];

  @Column({ type: 'datetime', nullable: true })
  fechaAsignacion: Date;

  @Column({ type: 'datetime', nullable: true })
  fechaResolucion: Date;

  @Column({ type: 'datetime', nullable: true })
  fechaEstimada: Date;

  @Column({ default: false })
  publicarCambio: boolean;

  @Column({ default: false })
  cambioPublicado: boolean;

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}
