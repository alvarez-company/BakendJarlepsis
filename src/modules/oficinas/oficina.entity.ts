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

  // Relación con Municipio comentada - oficinas eliminado
  // @ManyToOne(() => Municipio, (municipio) => municipio.oficinas)
  // @JoinColumn({ name: 'municipioId' })
  // municipio: Municipio;

  @Column({ type: 'text', nullable: true })
  oficinaDireccion: string;

  @Column({ nullable: true })
  oficinaTelefono: string;

  @Column({ nullable: true })
  oficinaCorreo: string;

  @Column({ type: 'longtext', nullable: true })
  oficinaFoto: string;

  @Column({ default: true })
  oficinaEstado: boolean;

  @Column({ nullable: true })
  sedeId: number;

  // Relaciones comentadas - oficinas eliminado, bodegas ahora pertenecen directamente a sedes
  // @ManyToOne(() => Sede, (sede) => sede.oficinas)
  // @JoinColumn({ name: 'sedeId' })
  // sede: Sede;

  // @OneToMany(() => Bodega, (bodega) => bodega.oficina)
  // bodegas: Bodega[];

  // @OneToMany(() => User, (user) => user.oficina)
  // usuarios: User[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

