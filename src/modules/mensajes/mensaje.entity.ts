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

@Entity('mensajes')
export class Mensaje {
  @PrimaryGeneratedColumn()
  mensajeId: number;

  @Column()
  grupoId: number;

  @Column()
  usuarioId: number;

  @Column({ type: 'text' })
  mensajeTexto: string;

  @Column({ nullable: true })
  mensajeRespuestaId: number; // ID del mensaje al que responde

  @Column({ type: 'json', nullable: true })
  archivosAdjuntos: string[] | null; // URLs o data URLs (base64) de archivos adjuntos

  @Column({ default: false })
  mensajeEditado: boolean;

  @Column({ default: true })
  mensajeActivo: boolean;

  @ManyToOne('Grupo', 'mensajes')
  @JoinColumn({ name: 'grupoId' })
  grupo: any;

  @ManyToOne('User', 'mensajesEnviados')
  @JoinColumn({ name: 'usuarioId' })
  usuario: any;

  @ManyToOne('Mensaje', 'respuestas', { nullable: true })
  @JoinColumn({ name: 'mensajeRespuestaId' })
  mensajeRespuesta: any;

  @OneToMany('Mensaje', 'mensajeRespuesta')
  respuestas: any[];

  @OneToMany('ReaccionMensaje', 'mensaje')
  reacciones: any[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}
