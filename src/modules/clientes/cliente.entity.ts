import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn()
  clienteId: number;

  @Column()
  clienteNombreCompleto: string;

  @Column({ nullable: true })
  clienteTelefono: string;

  @Column({ nullable: true })
  clienteCorreo: string;

  @Column({ unique: true })
  clienteDocumento: string;

  @Column({ type: 'text' })
  clienteDireccion: string;

  @Column({ nullable: true })
  municipioId: number;

  @Column({ default: 0 })
  cantidadInstalaciones: number;

  @Column({ nullable: true })
  usuarioRegistra: number;

  @OneToMany('Instalacion', 'cliente')
  instalaciones: any[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

