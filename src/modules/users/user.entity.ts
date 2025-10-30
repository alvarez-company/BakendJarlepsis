import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';

@Entity('usuarios')
export class User {
  @PrimaryGeneratedColumn()
  usuarioId: number;

  @Column()
  usuarioRolId: number;

  @Column({ nullable: true })
  usuarioSede: number;

  @Column({ nullable: true })
  usuarioBodega: number;

  @Column({ nullable: true })
  usuarioOficina: number;

  @Column()
  usuarioNombre: string;

  @Column()
  usuarioApellido: string;

  @Column({ unique: true })
  usuarioCorreo: string;

  @Column({ nullable: true })
  usuarioTelefono: string;

  @Column({ unique: true })
  usuarioDocumento: string;

  @Column()
  usuarioContrasena: string;

  @Column({ nullable: true })
  usuarioCreador: number;

  @Column({ default: true })
  usuarioEstado: boolean;

  @ManyToOne('Role', 'usuarios')
  @JoinColumn({ name: 'usuarioRolId' })
  usuarioRol: any;

  @ManyToOne('Sede', 'usuarios', { nullable: true })
  @JoinColumn({ name: 'usuarioSede' })
  sede: any;

  @ManyToOne('Oficina', 'usuarios', { nullable: true })
  @JoinColumn({ name: 'usuarioOficina' })
  oficina: any;

  @ManyToOne('Bodega', 'usuarios', { nullable: true })
  @JoinColumn({ name: 'usuarioBodega' })
  bodega: any;

  @OneToMany('Instalacion', 'usuarioTecnico')
  instalaciones: any[];

  @OneToMany('Instalacion', 'usuarioSupervisor')
  instalacionesSupervisadas: any[];

  @OneToMany('MovimientoInventario', 'usuario')
  movimientos: any[];

  @OneToMany('Traslado', 'usuario')
  traslados: any[];

  @OneToMany('InstalacionUsuario', 'usuario')
  instalacionesAsignadas: any[];

  @OneToOne('EstadoUsuario', 'usuario')
  estadoUsuario: any;

  @OneToMany('UsuarioGrupo', 'usuario')
  gruposUsuario: any[];

  @OneToMany('Mensaje', 'usuario')
  mensajesEnviados: any[];

  @OneToMany('ReaccionMensaje', 'usuario')
  reacciones: any[];

  @OneToMany('Notificacion', 'usuario')
  notificaciones: any[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}
