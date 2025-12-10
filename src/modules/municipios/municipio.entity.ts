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
import { Departamento } from '../departamentos/departamento.entity';
// import { Oficina } from '../oficinas/oficina.entity'; // Oficinas eliminado

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

  // Oficinas eliminado - las bodegas ahora pertenecen directamente a sedes
  // @OneToMany(() => Oficina, (oficina) => oficina.municipio)
  // oficinas: Oficina[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

