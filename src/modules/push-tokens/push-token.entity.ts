import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('push_tokens')
@Index(['usuarioId'])
@Index(['token'], { unique: true })
export class PushToken {
  @PrimaryGeneratedColumn()
  pushTokenId: number;

  @Column()
  usuarioId: number;

  @Column({ type: 'varchar', length: 32, default: 'web' })
  plataforma: string;

  @Column({ type: 'varchar', length: 512 })
  token: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'varchar', length: 512, nullable: true })
  userAgent?: string | null;

  @Column({ type: 'datetime', nullable: true })
  lastSeenAt?: Date | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  fechaCreacion: Date;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  fechaActualizacion: Date;
}

