import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('transferencias_tecnicos')
export class TransferenciaTecnico {
  @PrimaryGeneratedColumn()
  transferenciaTecnicoId: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  codigo: string;

  @Column()
  usuarioOrigenId: number;

  @Column()
  usuarioDestinoId: number;

  @Column({ type: 'json' })
  materiales: Array<{ materialId: number; cantidad: number; numerosMedidor?: string[] }>;

  @Column({ type: 'varchar', length: 120, nullable: true })
  numeroOrden: string | null;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ nullable: true })
  usuarioAsignadorId: number | null;

  @CreateDateColumn()
  fechaCreacion: Date;
}
