import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
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

  @Column({ nullable: true })
  categoriaPadreId: number;

  @Column({ default: true })
  categoriaEstado: boolean;

  @ManyToOne(() => Categoria, (categoria) => categoria.subcategorias, { nullable: true })
  @JoinColumn({ name: 'categoriaPadreId' })
  categoriaPadre: Categoria;

  @OneToMany(() => Categoria, (categoria) => categoria.categoriaPadre)
  subcategorias: Categoria[];

  @OneToMany('Material', 'categoria')
  materiales: any[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

