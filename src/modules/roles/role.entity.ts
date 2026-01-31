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
  /** Rol exclusivo del desarrollador del sistema. Un solo usuario en todo el sistema. No se lista en usuarios. Usado para procesos internos de desarrollo e impersonación. */
  SUPERADMIN = 'superadmin',
  /** Gerencia: mismos permisos que SuperAdmin pero sin impersonación. Rol de máximo nivel para la organización. */
  GERENCIA = 'gerencia',
  /** Único rol Administrador: siempre asignado a un centro operativo (sede). Gestiona todo su centro. */
  ADMIN = 'admin',
  ADMIN_INTERNAS = 'admin-internas', // Administrador solo bodegas internas (misma sede)
  ADMIN_REDES = 'admin-redes', // Administrador solo bodegas redes (misma sede)
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
