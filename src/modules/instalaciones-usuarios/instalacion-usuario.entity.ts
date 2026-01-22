import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('instalaciones_usuarios')
export class InstalacionUsuario {
  @PrimaryGeneratedColumn()
  instalacionUsuarioId: number;

  @Column()
  instalacionId: number;

  @Column()
  usuarioId: number;

  @Column({ nullable: true })
  rolEnInstalacion: string; // 'tecnico', 'empleado', 'supervisor'

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ default: true })
  activo: boolean;

  @ManyToOne('Instalacion', 'usuariosAsignados')
  @JoinColumn({ name: 'instalacionId' })
  instalacion: any;

  @ManyToOne('User', 'instalacionesAsignadas')
  @JoinColumn({ name: 'usuarioId' })
  usuario: any;

  @CreateDateColumn()
  fechaAsignacion: Date;
}
