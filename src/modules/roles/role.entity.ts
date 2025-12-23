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
  ADMINISTRADOR = 'administrador', // Centro Operativo - solo lectura
  TECNICO = 'tecnico',
  SOLDADOR = 'soldador',
  ALMACENISTA = 'almacenista',
  BODEGA = 'bodega',
  BODEGA_INTERNAS = 'bodega-internas',
  BODEGA_REDES = 'bodega-redes',
  // Roles legacy (mantener para compatibilidad)
  EMPLEADO = 'empleado',
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

