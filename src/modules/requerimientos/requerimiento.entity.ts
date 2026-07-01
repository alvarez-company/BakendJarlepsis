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

export enum SubmoduloRequerimiento {
  // Inventario
  INV_STOCK = 'inv_stock',
  INV_MOVIMIENTOS = 'inv_movimientos',
  INV_TRASLADOS = 'inv_traslados',
  INV_MATERIALES = 'inv_materiales',
  INV_BODEGAS = 'inv_bodegas',
  INV_ASIGNACIONES = 'inv_asignaciones',
  INV_AUDITORIA = 'inv_auditoria',
  // Instalaciones
  INST_LISTA = 'inst_lista',
  INST_PENDIENTES = 'inst_pendientes',
  INST_MATERIALES = 'inst_materiales',
  INST_MEDIDORES = 'inst_medidores',
  INST_ESTADOS = 'inst_estados',
  INST_PROYECTOS = 'inst_proyectos',
  // Usuarios
  USR_LISTA = 'usr_lista',
  USR_ROLES = 'usr_roles',
  USR_PERMISOS = 'usr_permisos',
  // Reportes
  REP_GENERAL = 'rep_general',
  REP_EXPORTACION = 'rep_exportacion',
  REP_ESTADISTICAS = 'rep_estadisticas',
  // Chat
  CHAT_MENSAJES = 'chat_mensajes',
  CHAT_GRUPOS = 'chat_grupos',
  // Medidores
  MED_LISTA = 'med_lista',
  MED_ASIGNACION = 'med_asignacion',
  MED_ESTADOS = 'med_estados',
  // General
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

  @Column({
    type: 'enum',
    enum: SubmoduloRequerimiento,
    nullable: true,
  })
  submodulo: SubmoduloRequerimiento;

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
