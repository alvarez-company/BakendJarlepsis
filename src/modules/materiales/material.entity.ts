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

export enum UnidadMedida {
  UNIDAD = 'unidad',
  KILOGRAMO = 'kg',
  GRAMO = 'g',
  LITRO = 'litro',
  METRO = 'metro',
  CAJA = 'caja',
  PAQUETE = 'paquete',
}

@Entity('materiales')
export class Material {
  @PrimaryGeneratedColumn()
  materialId: number;

  @Column()
  categoriaId: number;

  @Column()
  proveedorId: number;

  @Column()
  inventarioId: number;

  @Column({ unique: true })
  materialCodigo: string;

  @Column()
  materialNombre: string;

  @Column({ type: 'text', nullable: true })
  materialDescripcion: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  materialStock: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  materialStockMinimo: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  materialStockMaximo: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  materialPrecio: number;

  @Column({
    type: 'enum',
    enum: UnidadMedida,
    default: UnidadMedida.UNIDAD,
  })
  materialUnidadMedida: UnidadMedida;

  @Column({ nullable: true })
  materialMarca: string;

  @Column({ nullable: true })
  materialModelo: string;

  @Column({ nullable: true })
  materialSerial: string;

  @Column({ nullable: true })
  materialCodigoBarras: string;

  @Column({ nullable: true })
  materialFoto: string;

  @Column({ nullable: true })
  usuarioRegistra: number;

  @Column({ default: true })
  materialEstado: boolean;

  @ManyToOne('Categoria', 'materiales')
  @JoinColumn({ name: 'categoriaId' })
  categoria: any;

  @ManyToOne('Proveedor', 'materiales')
  @JoinColumn({ name: 'proveedorId' })
  proveedor: any;

  @ManyToOne('Inventario', 'materiales')
  @JoinColumn({ name: 'inventarioId' })
  inventario: any;

  @OneToMany('MovimientoInventario', 'material')
  movimientos: any[];

  @OneToMany('Traslado', 'material')
  traslados: any[];

  @OneToMany('ItemProyecto', 'material')
  itemsProyecto: any[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}

