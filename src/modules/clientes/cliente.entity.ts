import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EstadoClienteEntity } from '../estados-cliente/estado-cliente.entity';

export enum EstadoCliente {
  ACTIVO = 'activo',
  INSTALACION_ASIGNADA = 'instalacion_asignada',
  REALIZANDO_INSTALACION = 'realizando_instalacion',
}

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn()
  clienteId: number;

  @Column()
  nombreUsuario: string; // Nombre completo del usuario (persona a quien se le realiza la instalación)

  @Column({ nullable: true })
  clienteTelefono: string;

  @Column({ type: 'text' })
  clienteDireccion: string;

  @Column({ nullable: true })
  clienteBarrio: string;

  @Column({ nullable: true })
  municipioId: number;

  @Column({ default: 0 })
  cantidadInstalaciones: number;

  @Column({
    type: 'enum',
    enum: EstadoCliente,
    default: EstadoCliente.ACTIVO,
  })
  clienteEstado: EstadoCliente; // Mantener por compatibilidad

  @Column({ nullable: true })
  estadoClienteId: number;

  @ManyToOne(() => EstadoClienteEntity, { nullable: true })
  @JoinColumn({ name: 'estadoClienteId' })
  estadoCliente: EstadoClienteEntity;

  @Column({ nullable: true })
  usuarioRegistra: number;

  // Comentado temporalmente para evitar que TypeORM intente cargar automáticamente las instalaciones
  // Las instalaciones se cargan manualmente cuando es necesario.
  // @OneToMany('Instalacion', 'cliente')
  instalaciones: any[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

