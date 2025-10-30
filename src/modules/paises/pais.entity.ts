import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Departamento } from '../departamentos/departamento.entity';

@Entity('paises')
export class Pais {
  @PrimaryGeneratedColumn()
  paisId: number;

  @Column({ unique: true })
  paisNombre: string;

  @Column({ nullable: true })
  paisCodigo: string;

  @Column({ default: true })
  paisEstado: boolean;

  @OneToMany(() => Departamento, (departamento) => departamento.pais)
  departamentos: Departamento[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

