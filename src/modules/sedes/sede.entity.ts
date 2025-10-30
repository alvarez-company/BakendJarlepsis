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
import { Oficina } from '../oficinas/oficina.entity';
import { User } from '../users/user.entity';
import { Departamento } from '../departamentos/departamento.entity';

@Entity('sedes')
export class Sede {
  @PrimaryGeneratedColumn()
  sedeId: number;

  @Column()
  sedeNombre: string;

  @Column()
  departamentoId: number;

  @ManyToOne(() => Departamento, (departamento) => departamento.sedes)
  @JoinColumn({ name: 'departamentoId' })
  departamento: Departamento;

  @Column({ type: 'text', nullable: true })
  sedeDireccion: string;

  @Column({ nullable: true })
  sedeTelefono: string;

  @Column({ default: true })
  sedeEstado: boolean;

  @OneToMany(() => Oficina, (oficina) => oficina.sede)
  oficinas: Oficina[];

  @OneToMany(() => User, (user) => user.sede)
  usuarios: User[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

