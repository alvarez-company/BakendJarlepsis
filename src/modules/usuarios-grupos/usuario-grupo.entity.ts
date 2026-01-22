import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('usuarios_grupos')
export class UsuarioGrupo {
  @PrimaryGeneratedColumn()
  usuarioGrupoId: number;

  @Column()
  grupoId: number;

  @Column()
  usuarioId: number;

  @Column({ default: true })
  activo: boolean;

  @Column({ nullable: true })
  ultimaLectura: Date;

  @ManyToOne('Grupo', 'usuariosGrupo')
  @JoinColumn({ name: 'grupoId' })
  grupo: any;

  @ManyToOne('User', 'gruposUsuario')
  @JoinColumn({ name: 'usuarioId' })
  usuario: any;

  @CreateDateColumn()
  fechaIngreso: Date;
}
