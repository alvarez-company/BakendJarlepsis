import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('auditoria_numeros_medidor')
export class AuditoriaNumeroMedidor {
  @PrimaryGeneratedColumn()
  auditoriaId: number;

  @Column()
  numeroMedidorId: number;

  @Column()
  materialId: number;

  @Column({ type: 'varchar', length: 255 })
  numeroAnterior: string;

  @Column({ type: 'varchar', length: 255 })
  numeroNuevo: string;

  @Column({ nullable: true })
  usuarioId: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  usuarioNombre: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  usuarioCorreo: string;

  @Column({ type: 'text', nullable: true })
  motivo: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ipAddress: string;

  @ManyToOne('NumeroMedidor', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'numeroMedidorId' })
  numeroMedidor: any;

  @ManyToOne('Material', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'materialId' })
  material: any;

  @ManyToOne('User', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: any;

  @CreateDateColumn()
  fechaCambio: Date;
}
