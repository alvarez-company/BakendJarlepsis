import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('proyectos')
export class Proyecto {
  @PrimaryGeneratedColumn()
  proyectoId: number;

  @Column()
  proyectoNombre: string;

  @Column({ type: 'text', nullable: true })
  proyectoDescripcion: string;

  @Column({ nullable: true })
  proyectoCodigo: string;

  @Column({ default: true })
  proyectoEstado: boolean;

  /**
   * Clasificación funcional del proyecto para Redes:
   * - inversion
   * - mantenimiento
   */
  @Column({ nullable: true })
  proyectoTipo: string;

  /**
   * Tipología de terreno para Redes:
   * - ZV (zona verde)
   * - ACO (concreto andén)
   * - CO (concreto vía)
   */
  @Column({ nullable: true })
  proyectoTipologiaTerreno: string;

  @Column({ nullable: true })
  usuarioRegistra: number;

  @OneToMany('ItemProyecto', 'proyecto')
  items: any[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}
