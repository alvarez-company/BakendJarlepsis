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

  @Column({ default: true })
  bodegaEstado: boolean;

  @Column()
  oficinaId: number;

  @ManyToOne(() => Oficina, (oficina) => oficina.bodegas)
  @JoinColumn({ name: 'oficinaId' })
  oficina: Oficina;

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

