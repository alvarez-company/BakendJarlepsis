import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

export enum TipoGrupo {
  GENERAL = 'general',
  SEDE = 'sede',
  OFICINA = 'oficina',
  BODEGA = 'bodega',
  INSTALACION = 'instalacion',
  DIRECTO = 'directo',
}

@Entity('grupos')
export class Grupo {
  @PrimaryGeneratedColumn()
  grupoId: number;

  @Column()
  grupoNombre: string;

  @Column({ type: 'text', nullable: true })
  grupoDescripcion: string;

  @Column({
    type: 'enum',
    enum: TipoGrupo,
    default: TipoGrupo.GENERAL,
  })
  tipoGrupo: TipoGrupo;

  @Column({ nullable: true })
  entidadId: number; // ID de la oficina, bodega o instalación

  @Column({ default: true })
  grupoActivo: boolean;

  @OneToMany('Mensaje', 'grupo')
  mensajes: any[];

  @OneToMany('UsuarioGrupo', 'grupo')
  usuariosGrupo: any[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

