import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('tipos_documentos_identidad')
export class TipoDocumentoIdentidad {
  @PrimaryGeneratedColumn()
  tipoDocumentoId: number;

  @Column({ unique: true })
  tipoDocumentoCodigo: string; // CC, CE, NIT, etc.

  @Column()
  tipoDocumentoNombre: string; // Cédula de Ciudadanía, Cédula de Extranjería, etc.

  @Column({ type: 'text', nullable: true })
  tipoDocumentoDescripcion: string;

  @Column({ default: true })
  tipoDocumentoEstado: boolean;

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}
