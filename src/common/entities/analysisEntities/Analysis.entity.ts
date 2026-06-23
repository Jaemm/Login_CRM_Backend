import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Measurements } from './Measurements.entity';

@Index('analysis_batch_id_idx', ['batchId'], {})
@Index('analysis_pkey', ['batchId'], { unique: true })
@Entity('analysis', { schema: 'public' })
export class Analysis {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'batch_id' })
  batchId: number;

  @Column('bigint', { name: 'customer_id', nullable: true })
  customerId: string | null;

  @Column('json', { name: 'args', nullable: true })
  args: object | null;

  @Column('timestamp without time zone', {
    name: 'created_time',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdTime: Date;

  @OneToMany(() => Measurements, (measurements) => measurements.analysis)
  measurements: Measurements[];
}
