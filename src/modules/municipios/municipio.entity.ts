import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Departamento } from '../departamentos/departamento.entity';

@Entity('municipios')
export class Municipio {
  @PrimaryGeneratedColumn()
  municipioId: number;

  @Column()
  municipioNombre: string;

  @Column({ nullable: true })
  municipioCodigo: string;

  @Column({ default: true })
  municipioEstado: boolean;

  @Column()
  departamentoId: number;

  @ManyToOne(() => Departamento, (departamento) => departamento.municipios)
  @JoinColumn({ name: 'departamentoId' })
  departamento: Departamento;

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}
