import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum RoleType {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  TECNICO = 'tecnico',
  EMPLEADO = 'empleado',
  BODEGA = 'bodega',
  INVENTARIO = 'inventario',
  TRASLADOS = 'traslados',
  DEVOLUCIONES = 'devoluciones',
  SALIDAS = 'salidas',
  ENTRADAS = 'entradas',
  INSTALACIONES = 'instalaciones',
}

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  rolId: number;

  @Column({ unique: true })
  rolNombre: string;

  @Column({
    type: 'enum',
    enum: RoleType,
  })
  rolTipo: RoleType;

  @Column({ type: 'text', nullable: true })
  rolDescripcion: string;

  @Column({ default: true })
  rolEstado: boolean;

  @OneToMany(() => User, (user) => user.usuarioRol)
  usuarios: User[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

