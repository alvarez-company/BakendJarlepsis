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

export enum EstadoInstalacion {
  PENDIENTE = 'pendiente',
  EN_PROCESO = 'en_proceso',
  COMPLETADA = 'completada',
  FINALIZADA = 'finalizada',
  CANCELADA = 'cancelada',
}

@Entity('instalaciones')
export class Instalacion {
  @PrimaryGeneratedColumn()
  instalacionId: number;

  @Column()
  instalacionCodigo: string;

  @Column()
  tipoInstalacionId: number;

  @Column()
  clienteId: number;

  @Column({ nullable: true })
  instalacionMedidorNumero: string;

  @Column({ nullable: true })
  instalacionSelloNumero: string;

  @Column({ type: 'datetime', nullable: true })
  instalacionFechaHora: Date;

  @Column({ type: 'json', nullable: true })
  materialesInstalados: any;

  @Column({ type: 'json', nullable: true })
  instalacionProyectos: any;

  @Column({ type: 'text', nullable: true })
  instalacionObservaciones: string;

  @Column({
    type: 'enum',
    enum: EstadoInstalacion,
    default: EstadoInstalacion.PENDIENTE,
  })
  estado: EstadoInstalacion;

  @Column()
  usuarioRegistra: number;

  @ManyToOne('TipoInstalacion', 'instalaciones')
  @JoinColumn({ name: 'tipoInstalacionId' })
  tipoInstalacion: any;

  @ManyToOne('Cliente', 'instalaciones')
  @JoinColumn({ name: 'clienteId' })
  cliente: any;

  @OneToMany('MovimientoInventario', 'instalacion')
  movimientos: any[];

  @OneToMany('InstalacionUsuario', 'instalacion')
  usuariosAsignados: any[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}
