import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('proveedores')
export class Proveedor {
  @PrimaryGeneratedColumn()
  proveedorId: number;

  @Column()
  proveedorNombre: string;

  @Column({ nullable: true })
  proveedorNit: string;

  @Column({ nullable: true })
  proveedorTelefono: string;

  @Column({ nullable: true })
  proveedorEmail: string;

  @Column({ type: 'text', nullable: true })
  proveedorDireccion: string;

  @Column({ nullable: true })
  proveedorContacto: string;

  @Column({ default: true })
  proveedorEstado: boolean;

  @OneToMany('Material', 'proveedor')
  materiales: any[];

  @OneToMany('MovimientoInventario', 'proveedor')
  movimientos: any[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

