import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('asignaciones_tecnicos')
export class AsignacionTecnico {
  @PrimaryGeneratedColumn()
  asignacionTecnicoId: number;

  @Column({ unique: true })
  asignacionCodigo: string; // Código único de la asignación (ASIG-1, ASIG-2, etc.)

  @Column()
  usuarioId: number; // Técnico al que se le asignó

  @Column()
  inventarioId: number; // Bodega de origen

  @Column()
  usuarioAsignadorId: number; // Usuario que hizo la asignación

  @Column({ type: 'json' })
  materiales: Array<{
    materialId: number;
    cantidad: number;
    numerosMedidor?: string[]; // Números de medidor asignados en esta asignación
  }>; // Lista de materiales asignados

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({
    type: 'enum',
    enum: ['pendiente', 'aprobada', 'rechazada'],
    default: 'aprobada',
  })
  asignacionEstado: 'pendiente' | 'aprobada' | 'rechazada';

  @ManyToOne('User', 'asignacionesRecibidas', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: any;

  @ManyToOne('Inventario', 'asignacionesTecnicos', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inventarioId' })
  inventario: any;

  @ManyToOne('User', 'asignacionesRealizadas', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioAsignadorId' })
  usuarioAsignador: any;

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}
