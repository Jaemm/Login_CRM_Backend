import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Analysis } from './Analysis.entity';

@Index('measurements_hash_idx', ['hash'], {})
@Index('measurements_pkey', ['id'], { unique: true })
@Entity('measurements', { schema: 'public' })
export class Measurements {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column('character varying', { name: 'url', nullable: true, length: 255 })
  url: string | null;

  @Column({ type: 'integer', name: 'batch_id' })
  batchId: number;

  @Column('character varying', { name: 'sys_url', nullable: true, length: 255 })
  sysUrl: string | null;

  @Column('character varying', { name: 'hash', nullable: true, length: 50 })
  hash: string | null;

  @Column('timestamp without time zone', {
    name: 'created_time',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdTime: Date;

  @Column('jsonb', { name: 'args', nullable: true })
  args: object | null;

  @Column('jsonb', { name: 'scores', nullable: true })
  scores: object | null;

  @ManyToOne(() => Analysis, (analysis) => analysis.measurements, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn([{ name: 'batch_id', referencedColumnName: 'batchId' }])
  analysis: Analysis;
}
