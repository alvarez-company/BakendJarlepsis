import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';

export enum EstadoEnum {
  DESCONECTADO = 'desconectado',
  EN_LINEA = 'en_linea',
  OCUPADO = 'ocupado',
}

@Entity('estados_usuario')
export class EstadoUsuario {
  @PrimaryGeneratedColumn()
  estadoUsuarioId: number;

  @Column({ unique: true })
  usuarioId: number;

  @Column({
    type: 'enum',
    enum: EstadoEnum,
    default: EstadoEnum.DESCONECTADO,
  })
  estado: EstadoEnum;

  @Column({ type: 'text', nullable: true })
  mensajeEstado: string;

  @Column({ nullable: true })
  ultimaConexion: Date;

  @OneToOne('User', 'estadoUsuario')
  @JoinColumn({ name: 'usuarioId' })
  usuario: any;

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

