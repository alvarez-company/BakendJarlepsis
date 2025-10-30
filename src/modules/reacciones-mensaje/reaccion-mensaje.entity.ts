import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';

@Entity('reacciones_mensaje')
@Unique(['mensajeId', 'usuarioId'])
export class ReaccionMensaje {
  @PrimaryGeneratedColumn()
  reaccionMensajeId: number;

  @Column()
  mensajeId: number;

  @Column()
  usuarioId: number;

  @Column()
  tipoReaccion: string; // like, love, haha, wow, sad, angry

  @ManyToOne('Mensaje', 'reacciones')
  @JoinColumn({ name: 'mensajeId' })
  mensaje: any;

  @ManyToOne('User', 'reacciones')
  @JoinColumn({ name: 'usuarioId' })
  usuario: any;

  @CreateDateColumn()
  fechaCreacion: Date;
}

