import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('tipos_instalacion')
export class TipoInstalacion {
  @PrimaryGeneratedColumn()
  tipoInstalacionId: number;

  @Column()
  tipoInstalacionNombre: string;

  @Column({ nullable: true })
  usuarioRegistra: number;

  @OneToMany('Instalacion', 'tipoInstalacion')
  instalaciones: any[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

