import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('unidades_medida')
export class UnidadMedida {
  @PrimaryGeneratedColumn()
  unidadMedidaId: number;

  @Column({ unique: true })
  unidadMedidaNombre: string;

  @Column({ nullable: true })
  unidadMedidaSimbolo: string;

  @Column({ default: true })
  unidadMedidaEstado: boolean;

  @Column({ nullable: true })
  usuarioRegistra: number;

  @OneToMany('Material', 'unidadMedida')
  materiales: any[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}
