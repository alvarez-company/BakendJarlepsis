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
import { User } from '../users/user.entity';

@Entity('bodegas')
export class Bodega {
  @PrimaryGeneratedColumn()
  bodegaId: number;

  @Column()
  bodegaNombre: string;

  @Column({ type: 'text', nullable: true })
  bodegaDescripcion: string;

  @Column({ nullable: true })
  bodegaUbicacion: string;

  @Column({ nullable: true })
  bodegaTelefono: string;

  @Column({ nullable: true })
  bodegaCorreo: string;

  @Column({ type: 'longtext', nullable: true })
  bodegaFoto: string;

  @Column({ default: true })
  bodegaEstado: boolean;

  @Column({ nullable: true })
  bodegaTipo: string; // 'internas' | 'redes' | null

  @Column()
  sedeId: number;

  @ManyToOne(() => Sede, (sede) => sede.bodegas)
  @JoinColumn({ name: 'sedeId' })
  sede: Sede;

  @OneToMany(() => User, (user) => user.bodega)
  usuarios: User[];

  @OneToMany('Inventario', 'bodega')
  inventarios: any[];

  @OneToMany('Traslado', 'bodegaOrigen')
  trasladosOrigen: any[];

  @OneToMany('Traslado', 'bodegaDestino')
  trasladosDestino: any[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

