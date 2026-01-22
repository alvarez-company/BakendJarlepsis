import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('clasificaciones')
export class Clasificacion {
  @PrimaryGeneratedColumn()
  clasificacionId: number;

  @Column({ unique: true })
  clasificacionNombre: string;

  @Column({ type: 'text', nullable: true })
  clasificacionDescripcion: string;

  @Column({ default: true })
  clasificacionEstado: boolean;

  @Column({ nullable: true })
  usuarioRegistra: number;

  @OneToMany('Instalacion', 'clasificacion')
  instalaciones: any[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}
