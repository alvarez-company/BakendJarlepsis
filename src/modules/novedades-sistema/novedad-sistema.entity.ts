import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

export enum TipoNovedad {
  NUEVA_FUNCIONALIDAD = 'nueva_funcionalidad',
  MEJORA = 'mejora',
  CORRECCION = 'correccion',
  ACTUALIZACION = 'actualizacion',
  ANUNCIO = 'anuncio',
}

@Entity('novedades_sistema')
@Index(['fechaPublicacion'])
@Index(['activa', 'fechaPublicacion'])
export class NovedadSistema {
  @PrimaryGeneratedColumn()
  novedadId: number;

  @Column({ length: 200 })
  titulo: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({
    type: 'enum',
    enum: TipoNovedad,
    default: TipoNovedad.ACTUALIZACION,
  })
  tipo: TipoNovedad;

  @Column({ nullable: true })
  requerimientoId: number;

  @ManyToOne('Requerimiento', { nullable: true })
  @JoinColumn({ name: 'requerimientoId' })
  requerimiento: any;

  @Column({ nullable: true })
  publicadoPorId: number;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'publicadoPorId' })
  publicadoPor: any;

  @Column({ type: 'json', nullable: true })
  cambiosDetallados: string[];

  @Column({ length: 50, nullable: true })
  version: string;

  @Column({ default: true })
  activa: boolean;

  @Column({ default: false })
  destacada: boolean;

  @CreateDateColumn()
  fechaPublicacion: Date;
}
