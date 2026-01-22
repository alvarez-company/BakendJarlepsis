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
import { Pais } from '../paises/pais.entity';
import { Municipio } from '../municipios/municipio.entity';
import { Sede } from '../sedes/sede.entity';

@Entity('departamentos')
export class Departamento {
  @PrimaryGeneratedColumn()
  departamentoId: number;

  @Column()
  departamentoNombre: string;

  @Column({ nullable: true })
  departamentoCodigo: string;

  @Column({ default: true })
  departamentoEstado: boolean;

  @Column()
  paisId: number;

  @ManyToOne(() => Pais, (pais) => pais.departamentos)
  @JoinColumn({ name: 'paisId' })
  pais: Pais;

  @OneToMany(() => Municipio, (municipio) => municipio.departamento)
  municipios: Municipio[];

  @OneToMany(() => Sede, (sede) => sede.departamento)
  sedes: Sede[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}
