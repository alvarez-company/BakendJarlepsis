import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('categorias')
export class Categoria {
  @PrimaryGeneratedColumn()
  categoriaId: number;

  @Column()
  categoriaNombre: string;

  @Column({ type: 'text', nullable: true })
  categoriaDescripcion: string;

  @Column({ nullable: true })
  categoriaCodigo: string;

  @Column({ default: true })
  categoriaEstado: boolean;

  @OneToMany('Material', 'categoria')
  materiales: any[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}
