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
import { Bodega } from '../bodegas/bodega.entity';
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

  @Column({ nullable: true })
  sedeCorreo: string;

  @Column({ type: 'longtext', nullable: true })
  sedeFoto: string;

  @Column({ default: true })
  sedeEstado: boolean;

  @OneToMany(() => Bodega, (bodega) => bodega.sede)
  bodegas: Bodega[];

  @OneToMany(() => User, (user) => user.sede)
  usuarios: User[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

