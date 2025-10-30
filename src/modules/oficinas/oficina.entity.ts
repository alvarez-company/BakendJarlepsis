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
import { Sede } from '../sedes/sede.entity';
import { Bodega } from '../bodegas/bodega.entity';
import { User } from '../users/user.entity';
import { Municipio } from '../municipios/municipio.entity';

@Entity('oficinas')
export class Oficina {
  @PrimaryGeneratedColumn()
  oficinaId: number;

  @Column()
  oficinaNombre: string;

  @Column()
  municipioId: number;

  @ManyToOne(() => Municipio, (municipio) => municipio.oficinas)
  @JoinColumn({ name: 'municipioId' })
  municipio: Municipio;

  @Column({ type: 'text', nullable: true })
  oficinaDireccion: string;

  @Column({ nullable: true })
  oficinaTelefono: string;

  @Column({ default: true })
  oficinaEstado: boolean;

  @Column({ nullable: true })
  sedeId: number;

  @ManyToOne(() => Sede, (sede) => sede.oficinas)
  @JoinColumn({ name: 'sedeId' })
  sede: Sede;

  @OneToMany(() => Bodega, (bodega) => bodega.oficina)
  bodegas: Bodega[];

  @OneToMany(() => User, (user) => user.oficina)
  usuarios: User[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

